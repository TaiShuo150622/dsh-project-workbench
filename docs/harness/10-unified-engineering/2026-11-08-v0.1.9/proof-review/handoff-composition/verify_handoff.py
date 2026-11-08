"""Separate direct invariant implementation, with shared transition generator.

This is algorithm/encoding cross-check, not independently authored review.
"""
import importlib.util
from pathlib import Path
from dataclasses import asdict
import json, hashlib

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('model',ROOT/'check_handoff.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def independent_checks(s):
    paid={'A':s.settled_a,'B':s.settled_b}
    holds={'A':s.claim_a,'B':s.claim_b}
    costs=dict(paid); exposures=dict(paid)
    pending=[] if s.effect=='settled' else [(s.active_budget,s.hidden_cost,2 if s.effect=='unknown' else s.hidden_cost)]
    covered=True
    for budget,actual,upper in pending:
        costs[budget]+=actual;exposures[budget]+=upper
        covered=covered and holds[budget]>=upper
    return {'active_liability_covered':covered,
            'ledger_limits':all(paid[k]+holds[k]<=2 for k in paid),
            'world_exposure_limits':all(v<=2 for v in exposures.values()),
            'actual_cost_limits':all(v<=2 for v in costs.values()),
            'authorized_resolution':not s.unauthorized_resolution,
            'settled_not_double_counted':s.effect!='settled' or all(v==0 for v in holds.values())}

results=json.loads((ROOT/'results.json').read_text());rows=[]
for row in results['reports']:
    mode=row['mode'];seen={m.State()};todo=list(seen);bad=set();edges=0
    while todo:
        s=todo.pop()
        bad|={k for k,v in independent_checks(s).items() if not v}
        for _,t in m.successors(s,mode):
            edges+=1
            if t not in seen:seen.add(t);todo.append(t)
    assert len(seen)==row['states'] and edges==row['edges']
    assert bad==set(row['violations'])
    for name,trace in row['violations'].items():
        s=m.State()
        for event in trace:
            next_state=m.State(**event['state'])
            assert (event['action'],next_state) in list(m.successors(s,mode))
            s=next_state
        assert not independent_checks(s)[name]
    rows.append({'mode':mode,'states':len(seen),'edges':edges,'violations':sorted(bad)})

def walk(mode,actions):
    s=m.State();trace=[]
    for action in actions:
        targets=[t for a,t in m.successors(s,mode) if a==action]
        assert len(targets)==1,(action,s)
        s=targets[0];assert all(independent_checks(s).values())
        trace.append({'action':action,'state':asdict(s)})
    return s,trace

witnesses={}
end,trace=walk('conservative-cross',['OldEffectConsumes','OfferBoundPacket','GrantResolve','AcceptResolve','ReserveDestinationDurably','ControllerCrash','OldEffectConsumes','RecoverDurableState','CommitTransferWithDestinationClaim','ReleaseObsoleteSourceClaim','ObserveAuthoritativeTerminal','SettleOnce'])
assert end.settled_a==0 and end.settled_b==2 and end.claim_a==end.claim_b==0
witnesses['cross_transfer_hidden_cost_grows_during_crash_then_settles']=trace
end,trace=walk('conservative-same',['OfferBoundPacket','GrantResolve','AcceptResolve','RevokeResolveGrant'])
assert not any(a=='ObserveAuthoritativeTerminal' for a,_ in m.successors(end,'conservative-same'))
assert end.claim_a==2 and end.active_budget=='A'
witnesses['historical_resolve_acceptance_survives_but_current_execution_blocked']=trace
end,trace=walk('conservative-cross',['AdmitAndSpendFreshB','OfferBoundPacket','AcceptCustody','OldEffectConsumes'])
assert not any(a=='ReserveDestinationDurably' for a,_ in m.successors(end,'conservative-cross'))
assert end.owner=='receiver' and end.claim_a==2
witnesses['destination_insufficient_capacity_keeps_source_claim']=trace
end,trace=walk('conservative-same',['OfferBoundPacket','AcceptForward','OldEffectConsumes'])
assert not any(a=='ObserveAuthoritativeTerminal' for a,_ in m.successors(end,'conservative-same'))
witnesses['forward_acceptance_does_not_grant_resolution']=trace

out={'status':'PASS','scope':'Independent invariant formula encoding and DFS; shared transitions; same authoring agent, not independent model review.',
     'reports':rows,'positive_witnesses':witnesses,
     'model_sha256':hashlib.sha256((ROOT/'check_handoff.py').read_bytes()).hexdigest(),
     'checker_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(ROOT/'verification_receipt.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':'PASS','configurations':len(rows),'positive_witnesses':len(witnesses)}))
