"""Offline traceability validation of C-07. No original files are written."""
from pathlib import Path
from collections import Counter
from urllib.parse import unquote, urldefrag
import datetime
import hashlib
import json
import re

HERE = Path(__file__).resolve().parent
INTEGRATION = HERE.parents[5] / 'integration/docs/research/harness-20261107'
sha = lambda b: hashlib.sha256(b).hexdigest()
load = lambda name: json.loads((HERE / name).read_text())
index = load('source-index.json')
scope = load('scope-and-inputs.json')
observations = load('reading-observations.json')
attributions = load('identity-opinion-bindings.json')
url_index = load('url-index.json')
errors = []
checked = Counter()

def check(condition, label):
    checked['conditions'] += 1
    if not condition:
        errors.append(label)

inputs = {}
for entry in scope['files']:
    if entry['role'].startswith(('original_', 'root_')):
        path = HERE / entry['snapshot']
        check(sha(path.read_bytes()) == entry['sha256'], 'snapshot SHA ' + entry['file'])
        inputs[entry['file']] = (json.loads(path.read_text()), entry['sha256'])
        checked['input_hashes'] += 1

def resolve(origin):
    value, expected_sha = inputs[origin['file']]
    check(origin['file_sha256'] == expected_sha, 'origin SHA ' + str(origin))
    for part in origin['json_pointer'].strip('/').split('/'):
        key = part.replace('~1', '/').replace('~0', '~')
        value = value[int(key)] if isinstance(value, list) else value[key]
    checked['resolved_pointers'] += 1
    return value

groups = {g['id']: g for g in index['source_groups']}
docs = {d['id']: d for d in index['document_occurrences']}
reads = {r['id']: r for r in observations['root_observations']}
enrichments = {e['id']: e for e in observations['bibliography_enrichments']}
check(len(groups) == len(index['source_groups']), 'duplicate group ID')
check(len(docs) == len(index['document_occurrences']), 'duplicate document ID')
check(len(reads) == len(observations['root_observations']), 'duplicate read ID')

expected_groups = set()
for entry in index['catalogs']:
    original = inputs[entry['file']][0]
    key = entry['collection']
    expected_groups.update(entry['file'] + '#/' + key + '/' + str(i)
                           for i in range(len(original[key])))
check(expected_groups == set(groups), 'original catalog group coverage')
for gid, group in groups.items():
    original = resolve(group['origin'])
    check(original.get('id') == group['original_id'], 'original group ID ' + gid)
    check(original.get('title') == group['title'], 'original group title ' + gid)
    expected_fields = {k: original[k] for k in ('supported_claims', 'claims', 'supports', 'claim') if k in original}
    check(group['claims'] == expected_fields, 'claim scope changed ' + gid)
    for did in group['document_ids']:
        check(did in docs and docs[did]['source_group_id'] == gid, 'group/document edge ' + did)
    checked['group_records'] += 1

for did, doc in docs.items():
    original = resolve(doc['origin'])
    check(doc['source_group_id'] in groups, 'document group missing ' + did)
    if doc['url_is_literal_in_source']:
        literal = original if isinstance(original, str) else original.get('url')
        check(literal == doc['url'], 'literal URL changed ' + did)
    else:
        check(doc['document_role'] == 'pinned_repository_file', 'unexpected constructed document ' + did)
        check(doc['repository_scope'] in ('workbench', 'dsh'), 'missing repository scope ' + did)
        check(bool(doc['version_binding'].get('commit')), 'missing fixed commit ' + did)
        check(doc['version_binding'].get('blob') == original.get('blob'), 'file blob changed ' + did)
        check(doc['locators'].get('ranges') == original.get('ranges'), 'file ranges changed ' + did)
        check(doc['document_claims'].get('claims') == original.get('claims'), 'file claims changed ' + did)
        check(doc['remote_availability'].startswith('NOT_CHECKED_BY_THIS_INDEX'), 'constructed URL authority overclaim ' + did)
        checked['constructed_file_links'] += 1
    checked['document_records'] += 1

for rid, read in reads.items():
    original = resolve(read['origin'])
    check(original.get('url') == read['url'], 'review URL changed ' + rid)
    check(original.get('root_review_note') == read['note'], 'review note changed ' + rid)
    check(original.get('status') == read['status'], 'review status changed ' + rid)
    check(read['never_overwrites_author_read_status'], 'review overwrites author scope ' + rid)
    for match in read['document_matches']:
        if 'document_id' in match:
            check(match['document_id'] in docs, 'review document missing ' + rid)
            if match['relation'] == 'EXACT_URL':
                check(docs[match['document_id']]['url'] == read['url'], 'false exact review match ' + rid)
            else:
                check(urldefrag(docs[match['document_id']]['url'])[0] == urldefrag(read['url'])[0], 'false defragmented match ' + rid)
        else:
            check(resolve(match['original_URL_pointer']) == read['url'], 'false alternate URL match ' + rid)
    checked['root_review_records'] += 1

for eid, enrichment in enrichments.items():
    original = resolve(enrichment['origin'])
    check(enrichment['fields'] == original, 'enrichment metadata changed ' + eid)
    check(len(enrichment['review_ids']) == 1, 'enrichment review is not unique ' + eid)
    for rid in enrichment['review_ids']:
        check(rid in reads, 'enrichment missing review ' + eid)
        read = reads[rid]
        check(read['url'] == original['url'] and read['original_review_id'] == original['review_id'], 'enrichment identity mismatch ' + eid)
        check(eid in read['bibliography_enrichment_ids'], 'enrichment reverse edge missing ' + eid)
    check(enrichment['not_new_source_or_reading'], 'enrichment counted as read ' + eid)
    checked['bibliographic_enrichment_records'] += 1

for edge in attributions['relationships']:
    check(edge['subject_group'] in groups, 'identity subject missing')
    if 'target_group' in edge:
        check(edge['target_group'] in groups, 'identity target missing')
        if edge['target_group'] in groups:
            target = groups[edge['target_group']]
            check(target['original_id'] == edge['target_original_id'], 'identity short ID mismatch')
            check(target['origin']['file'] == groups[edge['subject_group']]['origin']['file'], 'identity cross-catalog short-ID collision')
    checked['identity_relationships'] += 1

for candidate in index['candidate_records']:
    resolve(candidate['origin'])
    check(candidate['claims_adopted'] is False, 'candidate promoted to adopted claim')
    checked['candidate_records'] += 1

urls = {u['url']: u for u in url_index['entries']}
check(len(urls) == len(url_index['entries']), 'duplicate exact URL key')
expected_urls = {d['url'] for d in docs.values() if d['url']} | {r['url'] for r in reads.values() if r['url']}
check(set(urls) == expected_urls, 'URL index missing or invented URL')
for did, doc in docs.items():
    check(did in urls[doc['url']]['document_occurrences'], 'URL index dropped document occurrence ' + did)
for rid, read in reads.items():
    check(rid in urls[read['url']]['root_read_observations'], 'URL index dropped review occurrence ' + rid)
for item in scope['literal_catalog_URL_occurrences']:
    check(resolve(item['origin']) == item['url'], 'literal catalog URL pointer')
    checked['literal_catalog_URL_pointers'] += 1

# Theme links are intended for the merged research package. Validate this
# directory locally and other research paths read-only in integration.
link_results = []
for name in ('README.md', 'SOURCE_INDEX.md'):
    for target in re.findall(r'\]\(([^)]+)\)', (HERE / name).read_text()):
        if re.match(r'https?://', target):
            continue
        path = unquote(target.split('#')[0])
        local = (HERE / path).resolve()
        if local.is_relative_to(HERE):
            exists = local.exists() or local.name in ('validation_receipt.json', 'SHA256SUMS')
            role = 'within_index'
        else:
            rel = Path('china/consolidated-sources') / path
            exists = (INTEGRATION / rel).resolve().exists()
            role = 'merged_research_navigation'
        check(exists, 'missing reader link ' + name + ' -> ' + path)
        link_results.append({'file': name, 'target': target, 'role': role, 'exists_at_validation': exists})

check(not index['issues'], 'generator reported structural issues')
receipt = {
    'schema_version': 1,
    'validated_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'capture_cutoff_utc': index['captured_at_utc'],
    'script_sha256': sha(Path(__file__).read_bytes()),
    'source_index_sha256': sha((HERE / 'source-index.json').read_bytes()),
    'network_requests': 0,
    'scope': 'Frozen metadata traceability, association preservation and local navigation; no external-source content verification or product test.',
    'checked': dict(checked),
    'reader_links': link_results,
    'errors': errors,
    'status': 'PASS' if not errors else 'FAIL',
}
(HERE / 'validation_receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'status': receipt['status'], 'checked': dict(checked), 'reader_links': len(link_results), 'errors': errors}, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(1)
