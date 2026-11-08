"""C-08: small event-labelled transition graphs, not a product simulator.

Reachability is exhaustive. Fair lasso search is BFS over a finite product
(state, enabled-somewhere, disabled-somewhere, action-seen), separately for
each reachable loop entry. Thus the returned prefix+loop has minimum total
edge count among periodic counterexamples in the chosen finite graph.

Fairness is on the explicitly named action family, not on every transition.
For a repeating loop: WF(A) needs disabled somewhere OR A taken; SF(A)
needs not enabled anywhere OR A taken. A closed walk may revisit states;
restricting the search to simple cycles would incorrectly miss some cases.
Finite dead ends acquire an analysis-only Halt self-loop. This represents
a maximal finite failed execution, not an assertion that the controller spins.
"""
from collections import deque, Counter
from dataclasses import dataclass
from pathlib import Path
import datetime
import hashlib
import json
import platform
import time

OUT = Path(__file__).resolve().parent

@dataclass(frozen=True)
class Rule:
    name: str
    mode: str
    actions: frozenset

@dataclass
class Model:
    name: str
    initial: tuple
    successors: object
    target: object
    fields: tuple
    rules: tuple = ()
    expected_lasso: bool = False
    bad: object = None
    expected_bad: object = None
    notes: str = ''

def graph_of(model):
    graph, todo = {}, deque([model.initial])
    while todo:
        state = todo.popleft()
        if state in graph:
            continue
        edges = list(model.successors(state))
        graph[state] = edges
        todo.extend(dst for _, dst in edges if dst not in graph)
    return graph

def prefix_paths(graph, initial, permitted=lambda s: True):
    paths = {initial: []} if permitted(initial) else {}
    todo = deque(paths)
    while todo:
        src = todo.popleft()
        for action, dst in graph[src]:
            if permitted(dst) and dst not in paths:
                paths[dst] = paths[src] + [(src, action, dst)]
                todo.append(dst)
    return paths

def longest_raw_path(graph, initial):
    """Exact longest path if the reachable raw graph is acyclic, else None.

    Halt loops used by temporal analysis are deliberately absent here.
    """
    visiting, memo = set(), {}
    def visit(state):
        if state in visiting:
            raise ValueError('cycle')
        if state in memo:
            return memo[state]
        visiting.add(state)
        length = max((1 + visit(dst) for _, dst in graph[state]), default=0)
        visiting.remove(state)
        memo[state] = length
        return length
    try:
        return visit(initial)
    except ValueError:
        return None

def enabled_mask(graph, state, rules):
    return sum(1 << i for i, rule in enumerate(rules)
               if any(action in rule.actions for action, _ in graph[state]))

def fair_masks(enabled, disabled, taken, rules):
    return all((disabled | taken) & (1 << i) if rule.mode == 'WF'
               else not enabled & (1 << i) or taken & (1 << i)
               for i, rule in enumerate(rules))

def shortest_fair_lasso(graph, model):
    bad_paths = prefix_paths(graph, model.initial, lambda s: not model.target(s))
    all_bits = (1 << len(model.rules)) - 1
    best, expanded = None, 0
    for anchor, prefix in bad_paths.items():
        mask = enabled_mask(graph, anchor, model.rules)
        initial = (anchor, mask, all_bits ^ mask, 0)
        todo, seen = deque([(initial, [])]), {initial}
        while todo:
            (src, enabled, disabled, taken), path = todo.popleft()
            expanded += 1
            if best is not None and len(prefix) + len(path) + 1 > best['length']:
                continue
            for action, dst in graph[src] or [('Halt', src)]:
                if model.target(dst):
                    continue
                en = enabled_mask(graph, dst, model.rules)
                used = sum(1 << i for i, rule in enumerate(model.rules) if action in rule.actions)
                key = (dst, enabled | en, disabled | (all_bits ^ en), taken | used)
                new_path = path + [(src, action, dst)]
                if dst == anchor and fair_masks(*key[1:], model.rules):
                    candidate = {'prefix': prefix, 'cycle': new_path,
                                 'length': len(prefix) + len(new_path),
                                 'fairness_masks': key[1:]}
                    if best is None or (candidate['length'], len(prefix)) < (best['length'], len(best['prefix'])):
                        best = candidate
                    # A longer closed walk from this product state cannot
                    # beat this shortest one, but other entries may do so.
                    todo.clear()
                    break
                if key not in seen:
                    seen.add(key)
                    todo.append((key, new_path))
    return best, expanded

def show_state(model, state):
    return dict(zip(model.fields, state))

def show_trace(model, edges):
    return [{'from': show_state(model, a), 'action': label, 'to': show_state(model, b)}
            for a, label, b in edges]

def replay_lasso(graph, model, result):
    if result is None:
        return
    state = model.initial
    for src, action, dst in result['prefix'] + result['cycle']:
        assert state == src and not model.target(src) and not model.target(dst)
        assert (action, dst) in (graph[src] or [('Halt', src)])
        state = dst
    assert result['cycle'][0][0] == result['cycle'][-1][2]
    for rule in model.rules:
        states = [edge[0] for edge in result['cycle']]
        flags = [any(label in rule.actions for label, _ in graph[s]) for s in states]
        occurs = any(label in rule.actions for _, label, _ in result['cycle'])
        assert (not all(flags) or occurs) if rule.mode == 'WF' else (not any(flags) or occurs)

def rule(name, mode, *actions):
    return Rule(name, mode, frozenset(actions))

def zero_budget(s):
    phase, spent = s
    if phase == 'run':
        yield 'QuerySame', s
        yield 'Deliver', ('accepted', spent + 1)

def busy(s):
    pending, heartbeat = s
    if pending:
        yield 'Background', (True, 1 - heartbeat)
        yield 'Discharge', (False, heartbeat)

def intermittent(s):
    available, done = s
    if not done:
        yield ('CloseWindow' if available else 'OpenWindow'), (not available, False)
        if available:
            yield 'Discharge', (True, True)

def unavailable(s):
    yield 'PollUnknown', s

def versions(churn):
    def steps(s):
        parity, produced, accepted = s
        if accepted:
            return
        if churn:
            yield 'ReviseGoal', (1 - parity, False, False)
        if not produced:
            yield 'Produce', (parity, True, False)
        else:
            yield 'Accept', (parity, True, True)
    return steps

def bounded_work(query_mutant=False, reject=False):
    def steps(s):
        a, b, auxiliary_left, outcome = s
        if outcome != 'running':
            return
        if a:
            yield 'AdvanceA', (a - 1, b, 2, outcome)
        if b:
            yield 'AdvanceB', (a, b - 1, 2, outcome)
        if not a and not b:
            yield 'Accept', (a, b, 2, 'accepted')
            if reject:
                yield 'Reject', (a, b, 2, 'rejected')
        if auxiliary_left:
            yield 'QuerySame', (a, b, auxiliary_left if query_mutant else auxiliary_left - 1, outcome)
    return steps

def handoff(early_transfer=False):
    def steps(s):
        packet, ack, stopped, owner, unknown = s
        if not packet:
            yield 'Offer', (True, False, False, 'receiver' if early_transfer else 'sender', unknown)
        elif not ack:
            yield 'AcceptResponsibility', (packet, True, stopped, 'receiver', unknown)
        if packet and not stopped:
            yield 'LocalStop', (packet, ack, True, owner, unknown)
    return steps

def eventual_clock(s):
    now, phase = s
    if now < 4:
        yield 'Tick', (now + 1, phase)
    if phase == 'run':
        yield 'Prepare', (now, 'offered')
    elif phase == 'offered':
        yield 'Ack', (now, 'received')

def bounded_deadline(delay=False):
    def steps(s):
        now, phase, unknown = s
        if phase == 'received' or now == 4:
            return
        if phase == 'run':
            if now < 1:
                yield 'Work', (now + 1, phase, unknown)
            yield 'Prepare', (now + 1, 'offered', unknown)
        else:
            yield 'Ack', (now + 1, 'received', unknown)
            if delay:
                yield 'DelayAck', (now + 1, phase, unknown)
    return steps

def service_window(force_due=False):
    def steps(s):
        now, completed, stopped = s
        if stopped:
            return
        if now == 4:
            yield 'CloseWindow', (now, completed, True)
            return
        due_index = {1: 0, 3: 1}.get(now)
        if due_index is not None:
            yield 'ObserveDue' + str(due_index), (now + 1, completed | (1 << due_index), False)
        if not force_due or due_index is None:
            yield 'TimePasses', (now + 1, completed, False)
    return steps

def rolling_obligation(s):
    parity, pending = s
    yield 'DischargeAndAdmitNext', (1-parity, pending)

def attempt_outcomes(s):
    parity, passed = s
    if not passed:
        yield 'AttemptFails', (1-parity, False)
        yield 'AttemptPasses', (parity, True)

def models():
    yield Model('C08-M01-zero-cost-loop', ('run', 0), zero_budget, lambda s: s[0] == 'accepted', ('phase','spent'), expected_lasso=True,
                notes='B=1. Every state has spent<=1; QuerySame has zero model cost. Does not assert real queries are free.')
    yield Model('C08-M02-fair-deliver', ('run',0), zero_budget, lambda s: s[0]=='accepted', ('phase','spent'), (rule('delivery','WF','Deliver'),),
                notes='Fairness on the continuously enabled productive action excludes M01; no time bound follows.')
    yield Model('C08-M03-busy-is-not-progress', (True,0), busy, lambda s:not s[0], ('pending','heartbeat'), (rule('any_work','WF','Background','Discharge'),), True,
                notes='Background performs real state changes. Aggregate work fairness does not discharge the pending obligation.')
    yield Model('C08-M04-intermittent-WF', (True,False), intermittent, lambda s:s[1], ('available','done'), (rule('discharge','WF','Discharge'),), True)
    yield Model('C08-M05-intermittent-SF', (True,False), intermittent, lambda s:s[1], ('available','done'), (rule('discharge','SF','Discharge'),), False,
                notes='Environment alternates availability in this graph; SF is an extra premise, not an implemented scheduler property.')
    yield Model('C08-M06-unavailable-even-SF', ('unknown',), unavailable, lambda s:False, ('effect',), (rule('resolution','SF','Resolve'),), True,
                notes='Resolve is never enabled; its SF is vacuous. No duplicate external send is allowed by this graph.')
    for churn in (False, True):
        yield Model('C08-M07-' + ('changing-goal' if churn else 'fixed-goal'), (0,False,False), versions(churn), lambda s:s[2], ('revision_parity','produced','accepted'),
                    (rule('production','WF','Produce'),rule('acceptance','WF','Accept')), churn,
                    notes='revision_parity is a quotient of an ever-increasing revision counter, not permission to reuse old version identities. ReviseGoal resets current evidence; the loop lifts by incrementing the real counter.')
    for mutant in (False, True):
        yield Model('C08-M08-' + ('query-cap-mutant' if mutant else 'bounded-controller'), (2,2,2,'running'), bounded_work(mutant), lambda s:s[3]!='running', ('stageA','stageB','auxiliaryLeft','outcome'), expected_lasso=mutant,
                    notes='Two obligations with two fixed stages each, one acceptance stage, K=2 auxiliary steps. Successful stage completion is assumed, not established for arbitrary Coding work.')
    yield Model('C08-M09-stopped-is-not-accepted', (2,2,2,'running'), bounded_work(reject=True), lambda s:s[3]=='accepted', ('stageA','stageB','auxiliaryLeft','outcome'), expected_lasso=True,
                bad=lambda s:s[3]=='rejected', expected_bad=True,
                notes='All actual controller paths terminate; the lasso ends in analysis-only Halt at a rejected terminal state.')
    for mutant in (False, True):
        yield Model('C08-M10-' + ('offer-transfer-mutant' if mutant else 'ack-transfer'), (False,False,False,'sender',True), handoff(mutant), lambda s:s[1], ('packet','ack','localStopped','owner','unknown'),
                    (rule('recipient_acceptance','WF','AcceptResponsibility'),), False,
                    bad=lambda s:s[3]=='receiver' and not s[1], expected_bad=mutant,
                    notes='Packet binds an unresolved effect; acknowledgement transfers responsibility but does not resolve that effect. Willing/authorized receiver is an explicit environment premise.')
    yield Model('C08-M11-local-stop-is-not-handoff', (False,False,False,'sender',True), handoff(), lambda s:s[1], ('packet','ack','localStopped','owner','unknown'),
                (rule('recipient_acceptance','WF','AcceptResponsibility'),), False,
                bad=lambda s:s[2] and not s[1], expected_bad=True)
    yield Model('C08-M12-fair-but-late', (0,'run'), eventual_clock, lambda s:s[1]=='received', ('clock','phase'),
                (rule('time','WF','Tick'),rule('prepare','WF','Prepare'),rule('receiver','WF','Ack')), False,
                bad=lambda s:s[0]>=3 and s[1]!='received', expected_bad=True,
                notes='Every fair behavior eventually receives, but deadline D=3 is not guaranteed. Any bad finite prefix can extend by Prepare/Ack and then stop fairly.')
    for mutant in (False, True):
        yield Model('C08-M13-' + ('receiver-delay-mutant' if mutant else 'bounded-deadline'), (0,'run',True), bounded_deadline(mutant), lambda s:s[1]=='received', ('clock','phase','unknown'), expected_lasso=mutant,
                    bad=lambda s:s[0]>=3 and s[1]!='received', expected_bad=mutant,
                    notes='D=3, cutoff=1; each transition consumes one discrete time unit. Prepare and recipient Ack take <=1 unit each only in the conservative case. Unknown remains true after receipt.')
    for force in (False, True):
        yield Model('C08-M14-service-' + ('scheduled' if force else 'missed'), (0,0,False), service_window(force), lambda s:s[2] and s[1]==3, ('clock','completedMask','stopped'), expected_lasso=not force,
                    bad=lambda s:s[2] and s[1]!=3, expected_bad=not force,
                    notes='Finite window [0,4], two due observations in slots 1 and 3. An observation can report no change and still discharge its due obligation. Closing is not retrospective coverage.')
    yield Model('C08-M15-finite-queue-open-closure', (0,1), rolling_obligation, lambda s:s[1]==0, ('current_id_parity','pending'),
                (rule('complete_current','WF','DischargeAndAdmitNext'),), True,
                notes='Each step completes the current obligation and admits a distinct new one under the same goal. Queue size is always one; the obligation universe is unbounded. Parity quotient lifts to successive fresh natural-number IDs, never ID reuse.')
    yield Model('C08-M16-fair-attempts-can-all-fail', (0,False), attempt_outcomes, lambda s:s[1], ('attempt_parity','passed'),
                (rule('attempt','WF','AttemptFails','AttemptPasses'),), True,
                notes='A productive option exists, and attempts run fairly, but outcome choice can always fail. Scheduling fairness is not an assumption of favorable external outcomes.')

def main():
    start = time.monotonic()
    reports, failed = [], []
    for model in models():
        graph = graph_of(model)
        lasso, expanded = shortest_fair_lasso(graph, model)
        replay_lasso(graph, model, lasso)
        paths = prefix_paths(graph, model.initial)
        bads = [s for s in paths if model.bad is not None and model.bad(s)]
        bad_path = min((paths[s] for s in bads), key=len) if bads else None
        expectation_ok = (lasso is not None) == model.expected_lasso and (model.expected_bad is None or (bad_path is not None) == model.expected_bad)
        if not expectation_ok:
            failed.append(model.name)
        report = {'id':model.name,'state_fields':model.fields,'initial':show_state(model,model.initial),
                  'reachable_states':len(graph),'explicit_edges':sum(map(len,graph.values())),
                  'action_counts':dict(Counter(label for edges in graph.values() for label,_ in edges)),
                  'analysis_only_Halt_loops':sum(not edges for edges in graph.values()),
                  'longest_raw_path_if_acyclic':longest_raw_path(graph,model.initial),
                  'fairness':[{'name':r.name,'mode':r.mode,'actions':sorted(r.actions)} for r in model.rules],
                  'fair_lasso_search_product_states':expanded,
                  'fair_counterexample':None if lasso is None else {'prefix':show_trace(model,lasso['prefix']),'cycle':show_trace(model,lasso['cycle']),'total_edges':lasso['length']},
                  'shortest_bad_prefix':None if bad_path is None else show_trace(model,bad_path),
                  'expected_outcome_matched':expectation_ok,'notes':model.notes}
        reports.append(report)
    result={'schema_version':1,'kind':'C08 finite auxiliary models; independent of P1-P15 counts','model_cases':reports,'failed_expectations':failed,
            'limits':['No product code is imported. No external effect, API or model call occurs.',
                      'Fairness is an explicit assumption on labelled events; this is not a TLC run.',
                      'No finite graph proves unbounded real-world liveness or a physical time bound.',
                      'A no-counterexample result is exhaustive only for the listed finite graph and fairness.',
                      'Halt loops encode maximal finite failure, not ongoing controller execution.']}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    md=['# C-08 可打印最短反例','', '前缀后重复 cycle 构成无限行为；Halt 表示已经停止的失败端点。长度按显式事件数计，初态为零步。','']
    for r in reports:
        md += ['## '+r['id'],'',f"状态 {r['reachable_states']}；显式边 {r['explicit_edges']}；fairness `{json.dumps(r['fairness'],ensure_ascii=False)}`。",'']
        if r['fair_counterexample']:
            for part in ('prefix','cycle'):
                md += [part+':','```text']
                md += [json.dumps(e['from'],ensure_ascii=False)+' --'+e['action']+'--> '+json.dumps(e['to'],ensure_ascii=False) for e in r['fair_counterexample'][part]] or ['(empty)']
                md += ['```']
        else:
            md += ['本图在所列 fairness 下没有避开目标的公平循环或失败死端。','']
        if r['shortest_bad_prefix'] is not None:
            md += ['最短 bad 前缀：','```text']+[e['action']+' -> '+json.dumps(e['to'],ensure_ascii=False) for e in r['shortest_bad_prefix']]+['```','']
        md += [r['notes'],'']
    (OUT/'TRACES.md').write_text('\n'.join(md)+'\n')
    receipt={'executed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'python':platform.python_version(),
             'program_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'results_sha256':hashlib.sha256((OUT/'results.json').read_bytes()).hexdigest(),
             'input_manifest_sha256':hashlib.sha256((OUT/'inputs.json').read_bytes()).hexdigest(),
             'source_catalog_sha256':hashlib.sha256((OUT/'sources.json').read_bytes()).hexdigest(),
             'case_count':len(reports),'total_reachable_states_across_distinct_cases':sum(r['reachable_states'] for r in reports),
             'total_explicit_edges_across_distinct_cases':sum(r['explicit_edges'] for r in reports),
             'counterexample_cases':sum(r['fair_counterexample'] is not None for r in reports),
             'bad_prefix_cases':sum(r['shortest_bad_prefix'] is not None for r in reports),
             'failed_expectations':failed,'elapsed_seconds':round(time.monotonic()-start,6),'product_code_imported':False,'network_requests':0,'model_api_calls':0}
    (OUT/'execution_receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(receipt,ensure_ascii=False,indent=2))
    if failed:
        raise SystemExit(1)

if __name__=='__main__':
    main()
