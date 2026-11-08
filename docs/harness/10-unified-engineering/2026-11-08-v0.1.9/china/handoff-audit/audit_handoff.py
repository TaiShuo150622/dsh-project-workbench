"""C10 independently authored history observer and backward counterexample search.

Shares the frozen R12 successor generator, not its liability/admission/invariant
helpers. This is not an independent transition implementation or general proof.
Only the local frozen model is imported; no product/network/API access.
"""
from collections import defaultdict, deque
from dataclasses import dataclass, replace, asdict
from pathlib import Path
import datetime
import hashlib
import importlib.util
import json
import platform
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('r12_frozen', ROOT / 'inputs/check_handoff.py')
m = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = m
spec.loader.exec_module(m)
MODES = ('conservative-same', 'conservative-cross', 'ack-releases',
         'release-first', 'ack-is-capability')


@dataclass(frozen=True)
class History:
    old_spend: int = 0
    fresh_a: int = 0
    fresh_b: int = 0
    posted_old_a: int = 0
    posted_old_b: int = 0
    denied_observation: bool = False


def observe(h, s, action):
    """Accumulate expenditures from events, not the model's resulting counters."""
    if action == 'OldEffectConsumes':
        return replace(h, old_spend=h.old_spend + 1)
    if action in ('AdmitAndSpendFreshA', 'AdmitAndSpendFreshB'):
        field = 'fresh_' + action[-1].lower()
        return replace(h, **{field: getattr(h, field) + 1})
    if action == 'SettleOnce':
        field = 'posted_old_' + s.active_budget.lower()
        return replace(h, **{field: getattr(h, field) + h.old_spend})
    if action == 'ObserveAuthoritativeTerminal' and s.owner == 'receiver':
        return replace(h, denied_observation=h.denied_observation or not
                       (s.acceptance == 'resolve' and s.receiver_grant))
    return h


def checks(s, h):
    """Independent historical accounting, including pending spent + future."""
    posted = (h.fresh_a + h.posted_old_a, h.fresh_b + h.posted_old_b)
    holds = (s.claim_a, s.claim_b)
    pending_spent = 0 if s.effect == 'settled' else h.old_spend
    pending_future = max(0, 2 - h.old_spend) if s.effect == 'unknown' else 0
    upper = pending_spent + pending_future
    budget = 0 if s.active_budget == 'A' else 1
    policy_actual = tuple(posted[j] + (pending_spent if j == budget else 0)
                          for j in range(2))
    return {
        'active_liability_covered': holds[budget] >= upper,
        'ledger_limits': all(posted[j] + holds[j] <= 2 for j in range(2)),
        'world_exposure_limits': all(posted[j] + (upper if j == budget else 0) <= 2
                                     for j in range(2)),
        'actual_cost_limits': all(x <= 2 for x in policy_actual),
        'authorized_resolution': not h.denied_observation,
        'settled_not_double_counted': s.effect != 'settled' or sum(holds) == 0,
        'event_ledger_matches_state': posted == (s.settled_a, s.settled_b),
        'hidden_cost_matches_spend_events': h.old_spend == s.hidden_cost,
        'world_cost_conserved': sum(policy_actual) == h.fresh_a + h.fresh_b + h.old_spend,
        'old_posted_once': h.posted_old_a + h.posted_old_b ==
                           (h.old_spend if s.effect == 'settled' else 0),
        'authorization_observer_matches_flag': h.denied_observation == s.unauthorized_resolution,
    }


def edge_checks(s, action, t):
    """Assertions about unchanged fields and ordering, separate from successors."""
    ledger = ('active_budget', 'transfer', 'claim_a', 'claim_b',
              'settled_a', 'settled_b', 'hidden_cost', 'effect')
    is_ack = action in ('AcceptCustody', 'AcceptForward', 'AcceptResolve',
                        'UpgradeToResolveAcceptance')
    return {
        'acceptance_preserves_liability_and_budget': not is_ack or
            all(getattr(s, f) == getattr(t, f) for f in ledger),
        'handoff_does_not_issue_grant': not is_ack or s.receiver_grant == t.receiver_grant,
        'only_explicit_authority_changes_grant': action in ('GrantResolve', 'RevokeResolveGrant')
            or s.receiver_grant == t.receiver_grant,
        'commit_has_destination_and_preserves_cost': action != 'CommitTransferWithDestinationClaim'
            or (s.transfer == 'prepared' and s.claim_b >= 2 and t.active_budget == 'B'
                and t.settled_a == s.settled_a and t.settled_b == s.settled_b
                and t.hidden_cost == s.hidden_cost and t.claim_a == s.claim_a),
        'source_release_requires_committed_coverage': action not in
            ('ReleaseObsoleteSourceClaim', 'ReleaseSourceBeforeDestination')
            or (s.transfer == 'committed' and s.active_budget == 'B' and s.claim_b >= 2),
        'abort_precedes_commit': action != 'AbortBeforeCommit' or
            (s.transfer == 'prepared' and s.active_budget == 'A' and t.claim_a == s.claim_a),
        'spent_never_decreases': t.hidden_cost >= s.hidden_cost,
        'settled_costs_never_migrate': t.settled_a >= s.settled_a and t.settled_b >= s.settled_b,
    }


def next_edges(s, mode, extension):
    yield from m.successors(s, mode)
    # These are premise removals, NOT paths in the original R12 graph.
    phase = {'expire-prepared': 'prepared', 'expire-committed': 'committed'}.get(extension)
    if phase == s.transfer and s.claim_b > 0 and not s.crashed:
        yield 'ExpireDestinationClaim_' + phase, replace(s, claim_b=0)


def graph(mode, extension=None):
    initial = (m.State(), History())
    todo = [initial]
    seen = {initial}
    forward = {}
    incoming = defaultdict(list)
    failures = defaultdict(set)
    edge_failures = defaultdict(list)
    action_counts = defaultdict(int)
    while todo:  # DFS graph construction; no source BFS paths are reused.
        node = todo.pop()
        s, h = node
        for name, good in checks(s, h).items():
            if not good:
                failures[name].add(node)
        # Deliberately stronger, unsupported physical-payer interpretation.
        if h.fresh_a + h.old_spend > 2:
            failures['immutable_origin_budget_limit'].add(node)
        out = []
        for action, t in next_edges(s, mode, extension):
            target = (t, observe(h, s, action))
            out.append((action, target))
            incoming[target].append((node, action))
            action_counts[action] += 1
            for name, good in edge_checks(s, action, t).items():
                if not good:
                    edge_failures[name].append((node, action, target))
            if target not in seen:
                seen.add(target)
                todo.append(target)
        forward[node] = out
    return initial, seen, forward, incoming, failures, edge_failures, action_counts


def shortest_trace(initial, targets, forward, incoming):
    """Multi-source reverse BFS: minimum event count to any bad state."""
    distance = {x: 0 for x in targets}
    queue = deque(targets)
    while queue:
        t = queue.popleft()
        for predecessor, _ in incoming[t]:
            if predecessor not in distance:
                distance[predecessor] = distance[t] + 1
                queue.append(predecessor)
    if initial not in distance:
        return None
    node = initial
    trace = []
    while distance[node]:
        choices = [(action, t) for action, t in forward[node]
                   if distance.get(t) == distance[node] - 1]
        action, target = sorted(choices, key=lambda x: (x[0], repr(x[1])))[0]
        trace.append({'action': action, 'state': asdict(target[0]), 'history': asdict(target[1])})
        node = target
    assert node in targets
    return trace


def run_case(mode, extension=None):
    initial, seen, forward, incoming, failures, edge_bad, actions = graph(mode, extension)
    traces = {name: shortest_trace(initial, targets, forward, incoming)
              for name, targets in sorted(failures.items())}
    edge_traces = {}
    for name, edges in sorted(edge_bad.items()):
        source_trace = shortest_trace(initial, {s for s, _, _ in edges}, forward, incoming)
        if source_trace:
            last = source_trace[-1]
            source = (m.State(**last['state']), History(**last['history']))
        else:
            source = initial
        action, t = sorted([(a, t) for s, a, t in edges if s == source], key=lambda x:x[0])[0]
        edge_traces[name] = source_trace + [{'action': action, 'state': asdict(t[0]), 'history': asdict(t[1])}]
    return {'mode': mode, 'extension': extension, 'history_product_states': len(seen),
            'projected_original_states': len({s for s, _ in seen}),
            'edges': sum(actions.values()), 'action_counts': dict(sorted(actions.items())),
            'state_counterexamples': traces, 'edge_counterexamples': edge_traces}


def walk(actions):
    s, h = m.State(), History()
    trace = []
    for action in actions:
        targets = [t for a, t in m.successors(s, 'conservative-cross') if a == action]
        assert len(targets) == 1, (action, s)
        h = observe(h, s, action)
        s = targets[0]
        assert all(checks(s, h).values()), action
        trace.append({'action': action, 'state': asdict(s), 'history': asdict(h)})
    return trace


def main():
    rows = [run_case(mode) for mode in MODES]
    originals = json.loads((ROOT / 'inputs/results.json').read_text())['reports']
    source_names = {'active_liability_covered', 'ledger_limits', 'world_exposure_limits',
                    'actual_cost_limits', 'authorized_resolution', 'settled_not_double_counted'}
    comparisons = []
    for row, original in zip(rows, originals):
        found = set(row['state_counterexamples']) & source_names
        expected = set(original['violations'])
        lengths_match = {name: len(row['state_counterexamples'][name]) == len(original['violations'][name])
                         for name in sorted(expected)}
        ok = (row['projected_original_states'] == original['states'] and row['edges'] == original['edges']
              and found == expected and all(lengths_match.values()))
        comparisons.append({'mode': row['mode'], 'same_original_state_edge_counts': ok,
                            'minimum_failure_lengths_match': lengths_match})
        assert ok
        extra = set(row['state_counterexamples']) - source_names - {'immutable_origin_budget_limit'}
        assert not extra, extra
    # Scope witnesses do not assert that an unmodeled transfer/settle grant is denied.
    witnesses = {
        'cross_commit_without_receiver_resolve_grant': walk([
            'OfferBoundPacket', 'AcceptCustody', 'ReserveDestinationDurably',
            'CommitTransferWithDestinationClaim']),
        'settlement_by_custody_owner_without_resolve_grant': walk([
            'OldEffectConsumes', 'ObserveAuthoritativeTerminal', 'OfferBoundPacket',
            'AcceptCustody', 'SettleOnce']),
        'revocation_after_terminal_does_not_disable_settlement': walk([
            'OfferBoundPacket', 'GrantResolve', 'AcceptResolve', 'OldEffectConsumes',
            'ObserveAuthoritativeTerminal', 'RevokeResolveGrant', 'SettleOnce']),
        'hidden_growth_during_crash_preserves_full_hold': walk([
            'OfferBoundPacket', 'AcceptCustody', 'ReserveDestinationDurably',
            'ControllerCrash', 'OldEffectConsumes', 'OldEffectConsumes', 'RecoverDurableState',
            'CommitTransferWithDestinationClaim', 'ReleaseObsoleteSourceClaim']),
        'destination_reserve_ignores_unmodeled_closing_cost': walk([
            'OfferBoundPacket', 'AcceptCustody', 'ReserveDestinationDurably']),
    }
    closing_state = witnesses['destination_reserve_ignores_unmodeled_closing_cost'][-1]['state']
    assert closing_state['settled_b'] + closing_state['claim_b'] + 1 == 3 > 2
    extensions = [run_case('conservative-cross', kind) for kind in ('expire-prepared', 'expire-committed')]
    for row in extensions:
        assert 'active_liability_covered' in row['state_counterexamples']
        assert 'actual_cost_limits' in row['state_counterexamples']
    assert 'immutable_origin_budget_limit' in rows[1]['state_counterexamples']
    result = {'scope': 'C10 finite history-observer review; shared frozen successors; no general proof',
              'source_comparisons': comparisons, 'original_cases': rows,
              'premise_removal_cases': extensions, 'scope_witnesses': witnesses,
              'closing_scope_example': {'extra_assumption':'B has a constant closing reserve R_B=1, absent in R12 state',
                                        'initial_B_exposure':1, 'after_preparation_B_exposure':3,
                                        'B_capacity':2, 'original_model_invariants_still_pass':True,
                                        'is_original_model_defect':False},
              'original_case_totals': {'states':sum(x['history_product_states'] for x in rows),
                                       'edges':sum(x['edges'] for x in rows)},
              'source_invariant_names': sorted(source_names)}
    data = (json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode()
    (ROOT / 'audit-results.json').write_bytes(data)
    receipt = {'status':'PASS', 'executed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'python':platform.python_version(), 'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
               'results_sha256':hashlib.sha256(data).hexdigest(), 'original_cases':5, 'premise_removal_cases':2,
               'independent_transition_implementation':False, 'product_execution':False, 'network_calls':0,
               'scope_witnesses':len(witnesses), 'source_counts':result['original_case_totals']}
    (ROOT / 'execution_receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(receipt, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
