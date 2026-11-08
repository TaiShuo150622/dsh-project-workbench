"""Validate C10 frozen inputs, local receipt agreement, links and printed paths."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re
import sys
sys.dont_write_bytecode = True
import audit_handoff as a

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--source-root', type=Path)
args = parser.parse_args()
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
manifest = json.loads((ROOT/'inputs.json').read_text())
source_checks = []
for entry in manifest['files']:
    assert sha(ROOT/entry['snapshot']) == entry['sha256'], entry
    if args.source_root:
        assert sha(args.source_root/entry['source']) == entry['sha256'], entry
        source_checks.append(entry['source'])
assert (ROOT/'rerun/results.json').read_bytes() == (ROOT/'inputs/results.json').read_bytes()
assert (ROOT/'rerun/verification_receipt.json').read_bytes() == (ROOT/'inputs/verification_receipt.json').read_bytes()
for name in ('check_handoff.py','verify_handoff.py'):
    assert (ROOT/'rerun'/name).read_bytes() == (ROOT/'inputs'/name).read_bytes()

result = json.loads((ROOT/'audit-results.json').read_text())
replayed = 0
def replay(trace, mode, extension=None):
    global replayed
    s, h = a.m.State(), a.History()
    previous = s
    for event in trace:
        previous = s
        t = a.m.State(**event['state'])
        assert (event['action'],t) in list(a.next_edges(s,mode,extension))
        h = a.observe(h,s,event['action'])
        assert a.asdict(h) == event['history']
        s = t
    replayed += 1
    return previous, s, h
for row in result['original_cases']+result['premise_removal_cases']:
    for name, trace in row['state_counterexamples'].items():
        _,s,h = replay(trace,row['mode'],row['extension'])
        if name == 'immutable_origin_budget_limit':
            assert h.fresh_a+h.old_spend > 2
        else:
            assert not a.checks(s,h)[name]
    for name, trace in row['edge_counterexamples'].items():
        prev,s,h = replay(trace,row['mode'],row['extension'])
        assert not a.edge_checks(prev,trace[-1]['action'],s)[name]
for trace in result['scope_witnesses'].values():
    _,s,h = replay(trace,'conservative-cross')
    assert all(a.checks(s,h).values())

receipt = json.loads((ROOT/'execution_receipt.json').read_text())
assert receipt['code_sha256'] == sha(ROOT/'audit_handoff.py')
assert receipt['results_sha256'] == sha(ROOT/'audit-results.json')
links=[]
for rel in ('README.md','REVIEW.md','TRACES.md','inputs/INDEX.md'):
    file=ROOT/rel
    for target in re.findall(r'\]\(([^)]+)\)',file.read_text()):
        if target.startswith(('http:','https:','#')):
            continue
        clean=target.split('#')[0]
        resolved=(file.parent/clean).resolve()
        assert resolved.exists() or resolved == ROOT/'validation_receipt.json', (rel,target)
        links.append({'file':rel,'target':target})
findings=json.loads((ROOT/'findings.json').read_text())['findings']
locations=0
for item in findings:
    for location in item['locations']:
        count=len((ROOT/location['file']).read_text().splitlines())
        assert all(1<=line<=count for line in location['lines'])
        locations += 1
out={'status':'PASS','validated_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
     'frozen_inputs':len(manifest['files']),'source_files_unchanged':len(source_checks),
     'source_root_revalidated':bool(args.source_root),'author_result_bytes_identical':True,
     'author_secondary_check_bytes_identical':True,'printed_paths_replayed':replayed,
     'reader_local_links':len(links),'finding_locations_with_valid_lines':locations,
     'main_source_sha256':sha(ROOT/'inputs/责任接管与负担连续性讨论稿-v0.1.0.md'),
     'audit_code_sha256':sha(ROOT/'audit_handoff.py'),'audit_results_sha256':sha(ROOT/'audit-results.json'),
     'validator_sha256':sha(Path(__file__)),'product_execution':False,'external_calls':0}
out['initial_validation_correction'] = ('Initial hash validation detected that the local input explanation reused '
    'inputs/README.md, overwriting the frozen copy. The frozen README was restored from its unchanged source, '
    'the explanation moved to inputs/INDEX.md, and all 11 input hashes were then revalidated. No author source changed.')
out['reproducibility_correction'] = ('A repeated process produced different JSON byte order because a set of '
    'expected invariant names was iterated without sorting. The comparison dictionary now uses sorted names; '
    'the state exploration and invariant formulas were unchanged. Separate subsequent processes are checked for byte equality.')
(ROOT/'validation_receipt.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(out,ensure_ascii=False,indent=2))
