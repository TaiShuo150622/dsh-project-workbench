"""Independent SCC oracle and direct bounded walk oracle; research only."""
from pathlib import Path
import importlib.util
import itertools
import json
import random
import hashlib

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('subject', HERE/'inputs/check_progress.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

def reach(graph, start, allowed):
    seen = {start} if start in allowed else set()
    todo = list(seen)
    while todo:
        s = todo.pop()
        for _, t in graph[s]:
            if t in allowed and t not in seen:
                seen.add(t); todo.append(t)
    return seen

def components(graph, allowed):
    # Mutual reachability partition, independent of subject's mask product.
    todo = set(allowed)
    while todo:
        s = next(iter(todo))
        forward = reach(graph, s, allowed)
        comp = {t for t in forward if s in reach(graph, t, allowed)}
        todo -= comp
        yield comp

def scc_oracle(graph, initial, target, rules):
    allowed = {s for s in graph if not target(s)}
    reachable = reach(graph, initial, allowed)
    analysis = {s: edges or [('Halt', s)] for s, edges in graph.items()}
    def inspect(nodes):
        for comp in components(analysis, nodes):
            internal = [(s,a,t) for s in comp for a,t in analysis[s] if t in comp]
            if not internal:
                continue
            remove = set()
            impossible = False
            for rule in rules:
                enabled = {s for s in comp if any(a in rule.actions for a,_ in graph[s])}
                taken = any(a in rule.actions for _,a,_ in internal)
                if taken:
                    continue
                if rule.mode == 'WF' and enabled == comp:
                    impossible = True
                    break
                if rule.mode == 'SF':
                    remove |= enabled
            if impossible:
                continue
            if not remove or inspect(comp - remove):
                return True
        return False
    return inspect(reachable)

def direct_fair(graph, edges, rules):
    for r in rules:
        flags = [any(a in r.actions for a,_ in graph[s]) for s,_,_ in edges]
        done = any(a in r.actions for _,a,_ in edges)
        if r.mode == 'WF' and all(flags) and not done:
            return False
        if r.mode == 'SF' and any(flags) and not done:
            return False
    return True

def brute_minimum(graph, model, limit):
    # Enumerate walks from initial and every possible suffix loop, with no masks.
    paths = [(model.initial, [])] if not model.target(model.initial) else []
    for depth in range(1, limit+1):
        nxt=[]
        for state, path in paths:
            for action, dst in graph[state] or [('Halt', state)]:
                if model.target(dst):
                    continue
                q = path + [(state, action, dst)]
                for k, (anchor,_,_) in enumerate(q):
                    if anchor == dst and direct_fair(graph, q[k:], model.rules):
                        return depth
                nxt.append((dst,q))
        paths=nxt
    return None

rows=[]
for model in m.models():
    graph=m.graph_of(model)
    actual,_=m.shortest_fair_lasso(graph,model)
    expected=scc_oracle(graph,model.initial,model.target,model.rules)
    assert bool(actual)==expected, model.name
    minimum=None if not actual else brute_minimum(graph,model,actual['length'])
    assert not actual or minimum==actual['length'], model.name
    # Independently enumerate layers to verify the first reachable bad depth.
    layer={model.initial}; seen=set(); bad_depth=None; depth=0
    while layer:
        if model.bad and any(model.bad(s) for s in layer):
            bad_depth=depth;break
        seen |= layer
        layer={t for s in layer for _,t in graph[s]}-seen
        depth+=1
    rows.append({'id':model.name,'scc_fair_counterexample':expected,'minimum_lasso_edges':minimum,'minimum_bad_prefix_edges':bad_depth})

rng=random.Random(20261108)
random_cases=0
for _ in range(1200):
    n=rng.randrange(1,6)
    graph={s:[(a,t) for a in ('a','b','c') for t in range(n) if rng.random()<0.16] for s in range(n)}
    target_set={s for s in range(n) if rng.random()<0.15}
    rules=tuple(m.rule(str(i),rng.choice(('WF','SF')),*rng.sample(('a','b','c'),rng.randrange(1,4))) for i in range(rng.randrange(4)))
    model=m.Model('random',0,lambda s:graph[s],lambda s:s in target_set,(),rules)
    actual,_=m.shortest_fair_lasso(graph,model)
    expected=scc_oracle(graph,0,model.target,rules)
    assert bool(actual)==expected, (graph,rules,target_set)
    if actual:
        assert direct_fair(graph,actual['cycle'],rules)
    random_cases+=1

# A fair composite walk must take both petals; neither simple cycle is fair.
petals={0:[('a',1),('b',2)],1:[('back',0)],2:[('back',0)]}
rules=(m.rule('a','SF','a'),m.rule('b','SF','b'))
petalmodel=m.Model('two-petals',0,lambda s:petals[s],lambda s:False,(),rules)
petal,_=m.shortest_fair_lasso(petals,petalmodel)
assert petal['length']==4 and brute_minimum(petals,petalmodel,4)==4
assert not direct_fair(petals,[(0,'a',1),(1,'back',0)],rules)
assert not direct_fair(petals,[(0,'b',2),(2,'back',0)],rules)

# Deliberately prune target edges before enabled: yields a false counterexample.
fair_deliver=next(x for x in m.models() if x.name=='C08-M02-fair-deliver')
g=m.graph_of(fair_deliver)
pruned={s:[(a,t) for a,t in edges if not fair_deliver.target(t)] for s,edges in g.items()}
mutant,_=m.shortest_fair_lasso(pruned,fair_deliver)
assert mutant and not scc_oracle(g,fair_deliver.initial,fair_deliver.target,fair_deliver.rules)

# Strong fairness substituted for weak fairness loses the intermittent witness.
intermittent=next(x for x in m.models() if x.name=='C08-M04-intermittent-WF')
g=m.graph_of(intermittent)
wf=scc_oracle(g,intermittent.initial,intermittent.target,intermittent.rules)
sf_rules=tuple(m.Rule(r.name,'SF',r.actions) for r in intermittent.rules)
sf=scc_oracle(g,intermittent.initial,intermittent.target,sf_rules)
assert wf and not sf

result={'scope':'Independent SCC existence oracle, direct finite walk enumeration for positive minima, layer search for bad minima; shared input graphs and action labels, no independent world model.',
        'author_cases':rows,'random_graph_cases':random_cases,'random_seed':20261108,
        'two_petals':{'shortest_fair_closed_walk':petal['length'],'simple_cycle_only_would_miss':True},
        'mutants_detected':['target-edge pruning corrupts enabled: M02','WF replaced by SF: M04','simple-cycle-only search: two-petal fixture'],
        'program_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'subject_sha256':hashlib.sha256((HERE/'inputs/check_progress.py').read_bytes()).hexdigest()}
(HERE/'oracle_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'author_cases':len(rows),'random_cases':random_cases,'mutants_detected':3,'status':'PASS'}))
