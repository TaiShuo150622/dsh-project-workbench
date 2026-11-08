#!/usr/bin/env python3
"""Static C13 identities/ranges/links only. No models, products or network."""
import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

p = argparse.ArgumentParser()
p.add_argument('--source-root', type=Path, required=True,
               help='Repository checkout containing the exact frozen inputs')
a = p.parse_args()
here = Path(__file__).resolve().parent
root = a.source_root.resolve()
read = lambda n: json.loads((here / n).read_text())
digest = lambda b: hashlib.sha256(b).hexdigest()
checks = []

def check(name, ok, detail=''):
    checks.append({'check': name, 'pass': bool(ok), 'detail': detail})

inputs = read('inputs.json')['files']
by_id = {x['id']: x for x in inputs}
check('unique_input_ids', len(inputs) == len(by_id))
for x in inputs:
    q = root / x['repository_relative_path']
    exists = q.is_file()
    check('exists:' + x['id'], exists)
    if not exists:
        continue
    data = q.read_bytes()
    count = len(data.decode().splitlines())
    check('sha:' + x['id'], digest(data) == x['sha256'])
    check('line_count:' + x['id'], count == x['line_count'])
    for lo, hi in x.get('read_ranges_1_based') or []:
        check('input_range:' + x['id'] + ':' + str(lo), 1 <= lo <= hi <= count)
    if x['read_mode'] == 'FULL':
        check('full_range:' + x['id'], x['read_ranges_1_based'] == [[1, count]])

archive = json.loads((root / 'docs/harness/MANIFEST.json').read_text())
archive_by_path = {x['path']: x for x in archive['files']}
reading = read('reading-list.json')
for x in reading['files']:
    check('archive_identity:' + x['id'],
          archive_by_path[x['repository_relative_path']]['sha256'] == x['sha256'])
    for prior in x['prior_reading']:
        check('prior_same_bytes:' + x['id'] + ':' + prior['id'], prior['sha256'] == x['sha256'])
check('body_count', len(reading['files']) == 11)
check('read_depth_counts', Counter(x['read_mode'] for x in reading['files']) == {'FULL': 3, 'SELECTED_BODY': 8})
check('selection_counts', Counter(x['selection_type'] for x in reading['files']) == {'NEW_BODY_SELECTION': 8, 'EXTENDS_PRIOR_SELECTED': 3})

decisions = read('decisions.json')
reference_count = 0
def walk(o):
    global reference_count
    if isinstance(o, dict):
        if 'input_id' in o:
            reference_count += 1
            x = by_id[o['input_id']]
            check('reference_identity:' + str(reference_count),
                  o['sha256'] == x['sha256'] and o['repository_relative_path'] == x['repository_relative_path'])
            allowed = x['read_ranges_1_based'] or []
            for lo, hi in o['line_ranges_1_based']:
                check('reference_read_scope:' + str(reference_count) + ':' + str(lo),
                      all(any(a <= n <= b for a, b in allowed) for n in range(lo, hi + 1)))
        for v in o.values():
            walk(v)
    elif isinstance(o, list):
        for v in o:
            walk(v)
walk(decisions)

selection = read('selection.json')
check('all_manifest_items_classified', {x['path'] for x in selection['items']} == set(archive_by_path))
check('selection_status_tallies', Counter(x['status'] for x in selection['items']) == selection['counts'])
check('activity_bodies_excluded', all(x['status'] == 'EXCLUDED_USER_SCOPE_BODY_NOT_READ' for x in selection['items'] if '/activity/' in x['path']))

markdown = (here / 'COVERAGE.md').read_text()
links = re.findall(r'\]\((<[^>]+>|[^)]+)\)', markdown)
for i, raw in enumerate(links, 1):
    target = unquote(raw.strip('<>').split('#', 1)[0])
    check('link_relative:' + str(i), not target.startswith(('/', 'http:', 'https:', 'file:')))
    q = here / target
    if not q.is_file():
        q = root / 'docs/research/harness-20261107/china/legacy-closure' / target
    check('link_exists:' + str(i), q.resolve().is_file() or target == 'validation.json')

for name in ['COVERAGE.md', 'reading-list.json', 'selection.json', 'inputs.json', 'decisions.json']:
    check('no_personal_absolute_paths:' + name,
          re.search(r'/(?:Users|home)/[^/\s]+', (here / name).read_text()) is None)

result = {
    'task': 'C13', 'checked_at_utc': datetime.now(timezone.utc).isoformat(),
    'result': 'PASS' if all(x['pass'] for x in checks) else 'FAIL',
    'counts': {'checks': len(checks), 'failed': sum(not x['pass'] for x in checks),
               'inputs': len(inputs), 'decision_reference_objects': reference_count,
               'markdown_links': len(links)},
    'command': 'python3 validate.py --source-root <exact-input-checkout>',
    'validator_sha256': digest(Path(__file__).read_bytes()),
    'scope': 'Static input bytes, declared ranges, citations and links; not approval authenticity, factual truth, implementation or runtime.',
    'checks': checks,
}
(here / 'validation.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: result[k] for k in ['result', 'counts']}, ensure_ascii=False))
for x in checks:
    if not x['pass']:
        print(json.dumps(x, ensure_ascii=False))
raise SystemExit(0 if result['result'] == 'PASS' else 1)
