"""R13 direct event-set projection oracle; fixed synthetic subject semantics.

Shares datatypes/operation implementation with subject, not the projection
function or its LABELS. This is not an authentication or visibility oracle.
"""
from pathlib import Path
import importlib.util
from dataclasses import replace,asdict
from itertools import permutations,product
import hashlib,json

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('subject',ROOT/'inputs/bounded_check.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

def oracle(events,key):
    asserted={};removed=set()
    for e in events:
        if e[0]=='observe':asserted[e[1].oid]=e[1]
        elif e[0]=='withdraw':removed.add(e[2])
        elif e[0]=='correct':removed.add(e[2]);asserted[e[3].oid]=e[3]
    roots={'+':set(),'-':set()}
    for oid,o in asserted.items():
        if oid in removed or o.key!=key or not o.authenticated or not o.admitted:continue
        roots[o.polarity].add(o.root)
    if roots['+']:
        label='BOTH' if roots['-'] else 'SUPPORT_ONLY'
    else:
        label='OPPOSE_ONLY' if roots['-'] else 'NEITHER'
    return {'state':label,'support_roots':sorted(roots['+']),'oppose_roots':sorted(roots['-']),
            'independence':'UNDETERMINED','action_permission':'NOT_COMPUTED'}

def apply(model,event):
    if event[0]=='observe':model.add(event[1])
    elif event[0]=='withdraw':model.withdraw(*event[1:])
    else:model.correct(*event[1:])

k=m.Key();other=replace(k,version='v2')
a=m.Observation('a:1','a',k,'+','shared-root')
b=m.Observation('a:2','a',k,'-','shared-root')
c=m.Observation('b:1','b',k,'+','shared-root')
d=m.Observation('a:3','a',other,'+','other-root')
events=(('observe',a),('observe',b),('observe',c),('withdraw','a','a:1'),
        ('correct','a','a:1',b),('withdraw','a','a:2'),('correct','a','a:2',d))
orders=0;prefix_checks=0
for order in permutations(events):
    model=m.Model();prefix=[]
    for e in order:
        apply(model,e);prefix.append(e)
        for key in (k,other):
            assert model.view(key)==oracle(prefix,key)
            prefix_checks+=1
    assert model.view(k)['state']=='SUPPORT_ONLY'
    assert model.view(other)['state']=='SUPPORT_ONLY'
    orders+=1

# Each observation independently absent, active or retired, with all four
# combinations of synthetic authenticated/admitted qualification flags.
assignments=0
options=list(product(range(3),(False,True),(False,True)))
for settings in product(options,repeat=4):
    model=m.Model();es=[]
    for ob,(status,auth,admitted) in zip((a,b,c,d),settings):
        o=replace(ob,authenticated=auth,admitted=admitted)
        if status:
            e=('observe',o);apply(model,e);es.append(e)
        if status==2:
            e=('withdraw',o.issuer,o.oid);apply(model,e);es.append(e)
    for key in (k,other):assert model.view(key)==oracle(es,key)
    assignments+=1

# Extend isolation to ALL six actual Key fields, including history and subject.
keys=[m.Key(*values) for values in product(('h1','h2'),('artifact:demo','artifact:other'),
       ('check-passed','published'),('v1','v2'),('alice','bob'),('review','delivery'))]
isolation=0
for source,target in permutations(keys,2):
    model=m.Model();model.add(replace(a,key=source));model.add(replace(b,key=source))
    assert model.view(source)['state']=='BOTH' and model.view(target)['state']=='NEITHER'
    isolation+=1

def binding(model,key,operation):
    return {'operation':operation,'claim_key':asdict(key),'policy_version':'demo-conservative-v1','watermark':len(model.events)}
policy_checks=0
for positive,negative,coverage,operation in product((False,True),(False,True),
        ('complete','partial','unknown'),('view','seek_evidence','publish','unlisted')):
    model=m.Model()
    if positive:model.add(a)
    if negative:model.add(b)
    out=m.candidate_policy(model,k,operation,binding(model,k,operation),coverage)
    ready=operation in ('view','seek_evidence') or (operation=='publish' and coverage=='complete' and positive and not negative)
    assert out['readiness']==('READY_FOR_AUTH_CHECK' if ready else 'UNKNOWN')
    assert out['action_permission']==out['fact_truth']=='NOT_COMPUTED'
    policy_checks+=1

# Unauthorized synthetic correction must preserve complete pre-state; identity
# collision validation must precede retirement. These are in-memory claims only.
model=m.Model();model.add(a);model.add(b)
before=(dict(model.observations),set(model.retired),list(model.events))
try:model.correct('a','a:1',replace(b,root='changed-under-same-id'))
except ValueError:pass
else:raise AssertionError('identity collision accepted')
assert before==(model.observations,model.retired,model.events)

# Explicitly classify visibility limit: caller saying complete without actually
# checking restricted evidence cannot be detected by this model.
visible=m.Model();visible.add(a)
partial=m.candidate_policy(visible,k,'publish',binding(visible,k,'publish'),'partial')
claimed_complete=m.candidate_policy(visible,k,'publish',binding(visible,k,'publish'),'complete')
assert partial['readiness']=='UNKNOWN'
assert claimed_complete['readiness']=='READY_FOR_AUTH_CHECK'

# Mutant-style differential traps: wrong absence-negation, latest-wins and
# supported-only release each disagree with explicit reference cases.
empty=m.Model();empty.add(a);empty.withdraw('a',a.oid)
conflict=m.Model();conflict.add(a);conflict.add(b)
mutation_checks={
    'absence_negation':empty.view(k)['state']!='OPPOSE_ONLY',
    'latest_received_wins':conflict.view(k)['state']!='OPPOSE_ONLY',
    'positive_only_publication':bool(conflict.view(k)['support_roots']) and m.candidate_policy(conflict,k,'publish',binding(conflict,k,'publish'))['readiness']=='UNKNOWN',
    'same_root_erases_conflict':conflict.view(k)['state']=='BOTH' and conflict.view(k)['support_roots']==conflict.view(k)['oppose_roots'],
}
assert all(mutation_checks.values())
result={'status':'PASS','script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
 'subject_sha256':hashlib.sha256((ROOT/'inputs/bounded_check.py').read_bytes()).hexdigest(),
 'mixed_event_permutations':orders,'prefix_key_checks':prefix_checks,
 'qualified_status_assignments':assignments,'all_six_key_field_isolation_pairs':isolation,
 'policy_cartesian_checks':policy_checks,'correction_identity_collision_is_atomic':True,
 'mutation_traps':mutation_checks,
 'visibility_limit_observed':{'partial_coverage':partial,'unsupported_complete_claim':claimed_complete,
 'classification':'Explicitly disclosed synthetic-input boundary, not a newly found defect.'},
 'limits':['Fixed consistent observation identities and single-colon synthetic issuer names.',
 'No world truth, root resolver, ACL, time-window parser or live operation executed.',
 'Oracle shares synthetic datatypes and key equality, but independently projects immutable event sets; not a general proof.']}
(ROOT/'oracle_results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if isinstance(v,(int,bool))},ensure_ascii=False))
