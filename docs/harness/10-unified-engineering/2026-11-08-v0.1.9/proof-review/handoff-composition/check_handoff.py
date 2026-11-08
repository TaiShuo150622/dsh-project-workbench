"""Finite R12 research model. No product imports, network, or API calls.

Budgets are policy envelopes, not physical billing accounts. An authorized
CommitTransfer may reattribute the ONE unsettled liability including old hidden
cost; immutable settled costs never move. This premise needs real refinement.
"""
from dataclasses import dataclass, replace, asdict
from collections import deque
from pathlib import Path
import json, hashlib, datetime, platform

OUT = Path(__file__).resolve().parent
CAP = 2
BOUND = 2

@dataclass(frozen=True)
class State:
    # One stable obligation o1/action1/generation1; these IDs never change.
    owner: str = 'sender'
    packet: bool = False
    acceptance: str = 'none'
    receiver_grant: bool = False
    active_budget: str = 'A'
    transfer: str = 'none'
    claim_a: int = BOUND
    claim_b: int = 0
    settled_a: int = 0
    settled_b: int = 0
    hidden_cost: int = 0
    effect: str = 'unknown'
    unauthorized_resolution: bool = False
    crashed: bool = False

def liability(s):
    return BOUND if s.effect == 'unknown' else s.hidden_cost if s.effect == 'terminal' else 0

def ledger_admits(s, budget, extra):
    return (s.settled_a+s.claim_a if budget=='A' else s.settled_b+s.claim_b)+extra <= CAP

def successors(s, mode):
    # World cost can still grow during a controller crash. It stays <= BOUND.
    if s.effect == 'unknown' and s.hidden_cost < BOUND:
        yield 'OldEffectConsumes', replace(s, hidden_cost=s.hidden_cost+1)
    if s.crashed:
        yield 'RecoverDurableState', replace(s, crashed=False)
        return
    yield 'ControllerCrash', replace(s, crashed=True)
    yield ('RevokeResolveGrant' if s.receiver_grant else 'GrantResolve'), replace(s, receiver_grant=not s.receiver_grant)
    if not s.packet:
        yield 'OfferBoundPacket', replace(s, packet=True)
    if s.packet and s.owner=='sender':
        for acceptance in ('custody','forward','resolve'):
            if acceptance=='resolve' and not s.receiver_grant and mode!='ack-is-capability':
                continue
            changes={'owner':'receiver','acceptance':acceptance}
            if mode=='ack-releases':
                changes['claim_a']=0
            yield 'Accept'+acceptance.title(), replace(s,**changes)
    if s.owner=='receiver' and s.acceptance!='resolve' and s.receiver_grant:
        yield 'UpgradeToResolveAcceptance', replace(s,acceptance='resolve')
    if s.effect=='unknown' and s.transfer in ('none','done'):
        can_resolve = s.owner=='sender' or (s.acceptance=='resolve' and (s.receiver_grant or mode=='ack-is-capability'))
        if can_resolve:
            authorized=s.owner=='sender' or s.receiver_grant
            # Atomic effect-side authoritative terminal evidence is ASSUMED,
            # not derived from possession of a grant or from a message ACK.
            yield 'ObserveAuthoritativeTerminal', replace(s,effect='terminal',unauthorized_resolution=s.unauthorized_resolution or not authorized)
    if s.effect=='terminal' and s.transfer in ('none','done'):
        if s.active_budget=='A':
            yield 'SettleOnce', replace(s,effect='settled',claim_a=0,settled_a=s.settled_a+s.hidden_cost)
        else:
            yield 'SettleOnce', replace(s,effect='settled',claim_b=0,settled_b=s.settled_b+s.hidden_cost)
    # Independent fresh work consumes and settles one unit atomically.
    for budget in ('A','B'):
        if ledger_admits(s,budget,1):
            field='settled_'+budget.lower()
            yield 'AdmitAndSpendFresh'+budget, replace(s,**{field:getattr(s,field)+1})
    if mode in ('conservative-cross','release-first') and s.owner=='receiver' and s.effect=='unknown':
        if s.transfer=='none':
            if mode=='release-first':
                yield 'ReleaseSourceBeforeDestination', replace(s,claim_a=0,transfer='released')
            elif ledger_admits(s,'B',BOUND):
                yield 'ReserveDestinationDurably', replace(s,claim_b=BOUND,transfer='prepared')
        elif s.transfer=='released' and ledger_admits(s,'B',BOUND):
            yield 'AcquireDestinationLater', replace(s,claim_b=BOUND,active_budget='B',transfer='done')
        elif s.transfer=='prepared':
            yield 'CommitTransferWithDestinationClaim', replace(s,active_budget='B',transfer='committed')
            yield 'AbortBeforeCommit', replace(s,claim_b=0,transfer='none')
        elif s.transfer=='committed':
            yield 'ReleaseObsoleteSourceClaim', replace(s,claim_a=0,transfer='done')

def direct_invariants(s):
    """Checks use hidden world cost and liability, independent of admission helper.

    No reliance on ledger_admits, expected trajectories, or owner==payer.
    """
    exposure_a=s.settled_a+(liability(s) if s.active_budget=='A' else 0)
    exposure_b=s.settled_b+(liability(s) if s.active_budget=='B' else 0)
    actual_a=s.settled_a+(s.hidden_cost if s.active_budget=='A' and s.effect!='settled' else 0)
    actual_b=s.settled_b+(s.hidden_cost if s.active_budget=='B' and s.effect!='settled' else 0)
    active_claim=s.claim_a if s.active_budget=='A' else s.claim_b
    return {
        'active_liability_covered':active_claim>=liability(s),
        'ledger_limits':s.settled_a+s.claim_a<=CAP and s.settled_b+s.claim_b<=CAP,
        'world_exposure_limits':exposure_a<=CAP and exposure_b<=CAP,
        'actual_cost_limits':actual_a<=CAP and actual_b<=CAP,
        'authorized_resolution':not s.unauthorized_resolution,
        'settled_not_double_counted':s.effect!='settled' or s.claim_a+s.claim_b==0,
    }

def explore(mode):
    initial=State();paths={initial:[]};todo=deque([initial]);edges=0;bad={};phases=set();effect_states=set()
    while todo:
        s=todo.popleft();phases.add(s.transfer);effect_states.add(s.effect)
        for inv,ok in direct_invariants(s).items():
            if not ok and inv not in bad:
                bad[inv]=paths[s]
        for action,t in successors(s,mode):
            edges+=1
            if t not in paths:
                paths[t]=paths[s]+[{'action':action,'state':asdict(t)}]
                todo.append(t)
    return {'mode':mode,'states':len(paths),'edges':edges,'violations':bad,'transfer_phases':sorted(phases),'effect_states':sorted(effect_states),'initial':asdict(initial)}

def main():
    modes=('conservative-same','conservative-cross','ack-releases','release-first','ack-is-capability')
    reports=[explore(mode) for mode in modes]
    expected={'conservative-same':set(),'conservative-cross':set(),
              'ack-releases':{'active_liability_covered','world_exposure_limits','actual_cost_limits','ledger_limits'},
              'release-first':{'active_liability_covered','world_exposure_limits','actual_cost_limits'},
              'ack-is-capability':{'authorized_resolution'}}
    # Every expected failure must be observed; unexpected failures also fail.
    checks={r['mode']:set(r['violations'])==expected[r['mode']] for r in reports}
    result={'kind':'R12 finite budget/ownership/capability model; not integrated','capacity_per_budget':CAP,'old_obligation_bound':BOUND,'reports':reports,'expected_violation_sets_match':checks,
            'limits':['One old obligation, two policy budgets, two actors; controller operations atomic and durable.',
                      'A destination reservation cannot be reclaimed after commit; abort only precedes commit.',
                      'Transfer reattributes all unsettled liability under an authorized policy; no claim about legal invoice transfers.',
                      'Settlement blocked during transfer; no parallel sender after owner CAS, no fencing implementation modeled.',
                      'Old actual consumption may grow up to a fixed total unreported bound of 2; no unbounded keepalive.',
                      'Grant validation and terminal authority modeled as booleans/atomic trusted actions, not authentication implementations.',
                      'No fairness or deadline claim; safe paths may remain blocked forever.']}
    (OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    receipt={'executed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'python':platform.python_version(),'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'results_sha256':hashlib.sha256((OUT/'results.json').read_bytes()).hexdigest(),'configurations':len(reports),'states_sum':sum(r['states'] for r in reports),'edges_sum':sum(r['edges'] for r in reports),'checks':checks,'product_execution':False,'external_calls':0}
    (OUT/'execution_receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(receipt,ensure_ascii=False,indent=2))
    if not all(checks.values()):
        raise SystemExit(1)

if __name__=='__main__':
    main()
