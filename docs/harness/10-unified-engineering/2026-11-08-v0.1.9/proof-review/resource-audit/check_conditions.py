"""Tiny resource-contract examples; not physical memory or product tests."""
from pathlib import Path
from dataclasses import dataclass, replace, asdict
from collections import deque
from itertools import product
import json,hashlib,datetime

OUT=Path(__file__).resolve().parent

@dataclass(frozen=True)
class S:
    epoch:int=0
    phase:str='active'
    users:int=0
    tokens:int=0
    issued:int=0
    count:int=0
    freed_epochs:int=0

def steps(s,mutant):
    for i in range(2):
        bit=1<<(2*s.epoch+i)
        if s.phase=='active' and not s.issued&bit:
            yield 'AcquireCurrentToken'+str(i),replace(s,users=s.users|bit,tokens=s.tokens|bit,issued=s.issued|bit,count=s.count+1)
    for token in range(4):
        bit=1<<token
        if s.users&bit:
            yield 'EndActualUse'+str(token),replace(s,users=s.users&~bit)
        if s.issued&bit and not s.users&bit:
            # Correct callbacks are bound to allocation generation and unique
            # token; replay is idempotent. Mutant decrements the current count
            # even when the old token is absent or belongs to an old generation.
            n=max(0,s.count-1) if mutant else s.count-(1 if s.tokens&bit else 0)
            t=replace(s,tokens=s.tokens&~bit,count=n)
            if t!=s:yield 'ReleaseCallback'+str(token),t
    if s.phase=='active':yield 'Retire',replace(s,phase='retiring')
    if s.phase=='retiring' and s.count==0:
        yield 'ReleaseAllocation',replace(s,phase='released',freed_epochs=s.freed_epochs|(1<<s.epoch))
    if s.phase=='released' and s.epoch==0:
        yield 'RecreateWithNewEpoch',replace(s,epoch=1,phase='active')

def invariants(s):
    # Physical use truth is tracked separately from the counted references.
    live_use_of_freed=any(s.users&(1<<t) and s.freed_epochs&(1<<(t//2)) for t in range(4))
    return {'count_matches_unique_tokens':s.count==bin(s.tokens).count('1'),
            'no_use_of_released_allocation':not live_use_of_freed,
            'every_user_has_token':s.users&~s.tokens==0}

def explore(mutant):
    initial=S();todo=deque([initial]);paths={initial:[]};bad={};edge_count=0
    while todo:
        s=todo.popleft()
        for name,ok in invariants(s).items():
            if not ok and name not in bad:bad[name]=paths[s]
        for a,t in steps(s,mutant):
            edge_count+=1
            if t not in paths:
                paths[t]=paths[s]+[{'action':a,'state':asdict(t)}];todo.append(t)
    return {'variant':'naive-counter' if mutant else 'unique-generation-tokens','states':len(paths),'edges':edge_count,'violations':bad}

# Snapshot arithmetic over 3 distinct physical allocations. Same-content
# physical allocations remain separate; maxima include concurrent transients.
assignments=0;admitted=0
for pairs in product(tuple((a,b) for b in range(3) for a in range(b+1)),repeat=3):
    for h,t,j,capacity in product(range(2),range(3),range(2),range(9)):
        assignments+=1
        ledger=h+sum(b for a,b in pairs)+t+j
        if ledger<=capacity:
            admitted+=1
            worst_actual=h+sum(a for a,b in pairs)+t+j
            assert worst_actual<=capacity

shared={'case':'two users, one physical allocation','physical_allocations':[{'allocation':'p1','logical':'same-content','size':2}],
        'use_refs':['taskA->p1','taskB->p1'],'correct_total':2,'per_user_sum':4,
        'classification':'Overcount is conservative for an upper bound, but not precise physical usage.'}
copies={'case':'same logical content, different physical allocations','capacity':2,
        'physical_allocations':[{'allocation':'p1','logical':'same-content','size':2},{'allocation':'p2','logical':'same-content','size':2}],
        'wrong_content_dedup_total':2,'actual_total':4,
        'classification':'Violates complete physical-allocation accounting premise, not RL1 itself.'}
transient={'case':'overlapping admission transients','capacity':3,'stable_bounds':[1,1],
           'simultaneous_transients':[1,1],'wrong_single_transition_T':1,'wrong_ledger':3,'actual_peak':4,
           'classification':'T must cover aggregate overlap; per-transition peak is insufficient.'}
good=explore(False);bad=explore(True)
assert not good['violations']
assert set(bad['violations'])=={'count_matches_unique_tokens','no_use_of_released_allocation'}
result={'scope':'R14 finite assumptions check; not a product fault or memory benchmark',
        'snapshot_assignments':assignments,'admitted_snapshots_checked':admitted,
        'accounting_examples':[shared,copies,transient],'reference_models':[good,bad],
        'limits':['Actual usages and bounds are synthetic given truths.',
                  'Acquire/retire/free are atomic; all uses are registered and ended truthfully.',
                  'No queued external callbacks other than explicit token releases; no real process, allocator or filesystem.',
                  'No liveness, cleanup deadline, memory return to OS, or authority implementation is proved.']}
(OUT/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
receipt={'executed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
         'results_sha256':hashlib.sha256((OUT/'results.json').read_bytes()).hexdigest(),
         'assignments':assignments,'admitted':admitted,'reference_states':good['states'],'mutant_states':bad['states'],
         'product_execution':False,'external_calls':0}
(OUT/'execution_receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(receipt))
