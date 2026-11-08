"""C11 offline union of frozen C07 keys and explicitly scoped later catalogues.

No network. No raw source catalogues are modified or copied. This script writes
only beside itself. All stored source paths are relative to the research root.
"""
from pathlib import Path
from collections import Counter, defaultdict
import argparse
import datetime
import hashlib
import json
import re
from urllib.parse import urlsplit, unquote

HERE = Path(__file__).resolve().parent
PREFIX = 'china/consolidated-sources/'
BASE_FILES = [PREFIX+x for x in ('source-index.json','url-index.json',
    'reading-observations.json','identity-opinion-bindings.json','scope-and-inputs.json')]
SPECS = [
    *[(f'ROOT_SOURCE_REVIEW_{n}.json','entries','root_reopen','root-review') for n in range(5,9)],
    ('ROOT_SOURCE_REVIEW_9.json','entries','mirrored_primary_read','resources'),
    ('ROOT_SOURCE_REVIEW_9.json','failed_candidates','mirrored_candidate','resources'),
    ('west/trusted-entry-map/sources.json','inputs','trusted_input','trusted-entry'),
    ('west/historical-coverage/reading-list.json','entries','archive_reading','history'),
    ('proof-review/relay-durability-audit/SOURCE_MANIFEST.json','files','source_fingerprint','durability'),
    ('china/progress-conditions/sources.json','sources','primary_declaration','progress'),
    ('west/evidence-disputes/sources.json','literature','primary_declaration','disputes'),
    ('west/evidence-disputes/sources.json','local_inputs','local_research_input','disputes'),
    ('west/evidence-disputes/literature.json','sources','mirrored_bibliography','disputes'),
    ('mechanisms/interop-contracts/sources.json','sources','primary_declaration','interop'),
    ('resource-lifecycle/sources.json','sources','primary_declaration','resources'),
    ('resource-lifecycle/sources.json','failed_candidates','failed_candidate','resources'),
    ('west/design-continuity/reading-list.json','files','design_continuity_reading','history'),
]
DATES = ('date','published_at','published_date','publication_date_precision','published_date_precision',
    'publication_date_basis','snapshot_commit_date','accessed_at','accessed_at_utc','captured_at_utc',
    'recorded_at_utc','read_window_utc','read_date')
VERSIONS = ('version','commit','fixed_commit','repository','file','path','sha256','blob_sha','git_blob',
    'git_blob_sha1','working_copy_matches_fixed_commit','matches_base_commit')
READING = ('read_status','read_mode','read_scope','read_range','read_ranges_1_based','line_ranges',
    'coverage','reading_coverage','retrieval_status','location','status','total_lines','line_count')
CLAIMS = ('supported_claims','claims','supports','root_review_note','our_application_inferences')
LIMITS = ('limits','limitations','not_supported','notes','runtime_tested','evidence_class','claim_class',
    'full_pdf_copied_into_deliverable','implementation_claim_status')
ATTRIBUTION = ('author','authors','organization','organization_or_author','venue')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def safe_value(value):
    if isinstance(value,str):
        return not (value.startswith('/') or re.search(r'/(Users|home|private/tmp)/', value))
    if isinstance(value,list):
        return all(safe_value(v) for v in value)
    if isinstance(value,dict):
        return all(safe_value(v) for v in value.values())
    return True


def pick(obj, names):
    return {k:obj[k] for k in names if k in obj and safe_value(obj[k])}


def pointer(obj, ptr):
    for part in ptr.lstrip('/').split('/') if ptr else []:
        part=part.replace('~1','/').replace('~0','~')
        obj=obj[int(part)] if isinstance(obj,list) else obj[part]
    return obj


def git_identity(url):
    u=urlsplit(url)
    parts=unquote(u.path).strip('/').split('/')
    if u.netloc=='github.com' and len(parts)>=5 and parts[2]=='blob':
        return '/'.join(parts[:2]),parts[3],'/'.join(parts[4:])
    if u.netloc=='raw.githubusercontent.com' and len(parts)>=4:
        return '/'.join(parts[:2]),parts[2],'/'.join(parts[3:])
    return None


def url_kind(url):
    if url.startswith(('https://','http://')):
        return 'external_http'
    return 'legacy_local_reference' if not url.startswith('/') else 'legacy_absolute_reference'


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--research-root',type=Path,default=HERE.parents[1])
    parser.add_argument('--frozen',action='store_true')
    args=parser.parse_args()
    root=args.research_root.resolve()
    catalogues={}
    manifest=[]
    files=sorted(set(BASE_FILES+[s[0] for s in SPECS]))
    old=json.loads((HERE/'manifest.json').read_text()) if args.frozen else None
    old_by_file={f['file']:f for f in old['inputs']} if old else {}
    for f in files:
        data=(root/f).read_bytes()
        catalogues[f]=json.loads(data)
        manifest.append({'file':f,'sha256':sha(data),'bytes':len(data),
                         'role':'C07_frozen_subject_index' if f in BASE_FILES else 'later_catalogue'})
        if old:
            assert sha(data)==old_by_file[f]['sha256'], 'frozen input changed: '+f
    captured=old['captured_at_utc'] if old else datetime.datetime.now(datetime.timezone.utc).isoformat()
    rows=[]
    for file,collection,role,topic in SPECS:
        top=catalogues[file]
        for i,item in enumerate(top[collection]):
            ptr='/'+collection+'/'+str(i)
            rid=file+'#'+ptr
            actual_role=role
            if role=='trusted_input':
                actual_role='fixed_code_reading' if item.get('url') else 'local_research_input'
            record={'id':rid,'original_id':item.get('id'), 'topic':topic,'role':actual_role,
                'origin':{'file':file,'file_sha256':sha((root/file).read_bytes()),'json_pointer':ptr},
                'title':item.get('title',item.get('path',item.get('repository_relative_path',item.get('source','')))),
                'attribution':pick(item,ATTRIBUTION),'dates':pick(item,DATES),
                'catalogue_dates':pick(top,DATES),'version_binding':pick(item,VERSIONS),
                'reading_declaration':pick(item,READING),'claims':pick(item,CLAIMS),
                'limitations':pick(item,LIMITS),'urls':[],
                'local_identity':pick(item,('archive_relative_path','repository_relative_path','integration_relative_path','category')),
                'absolute_source_fields_omitted':any(isinstance(v,str) and v.startswith('/') for v in item.values()),
                'reading_not_newly_verified_by_C11':True,'runtime_not_inferred':True}
            record['omitted_fields']={section:[k for k in fields if k in item and not safe_value(item[k])]
                for section,fields in [('reading_declaration',READING),('version_binding',VERSIONS),
                    ('claims',CLAIMS),('limitations',LIMITS),('attribution',ATTRIBUTION),('dates',DATES)]}
            if not safe_value(record['title']):
                record['title']=Path(record['title']).name
            for local_key in ('source','path'):
                raw=item.get(local_key)
                marker='/docs/research/harness-20261107/'
                if isinstance(raw,str) and raw.startswith('/') and marker in raw:
                    record['local_identity']['research_relative_path']=raw.split(marker,1)[1]
                    record['local_identity']['derived_from_absolute_field_without_retaining_prefix']=True
            for key in ('url','fixed_url','source'):
                value=item.get(key)
                if isinstance(value,str) and value.startswith(('http://','https://')):
                    record['urls'].append({'url':value,'kind':'literal','origin_pointer':ptr+'/'+key})
            if role=='source_fingerprint' and item.get('source','').startswith('git:'):
                _,commit,path=item['source'].split(':',2)
                repo='TaiShuo150622/dsh-project-workbench'
                record['urls'].append({'url':f'https://github.com/{repo}/blob/{commit}/{path}',
                    'kind':'constructed_fixed_file','derivation':{'repository':repo,'commit':commit,'path':path},
                    'remote_availability':'NOT_RECHECKED_BY_C11'})
                record['version_binding'].update({'repository':repo,'commit':commit,'file':path})
            if not record['reading_declaration']:
                record['reading_status']='UNSPECIFIED_IN_THIS_MANIFEST'
            else:
                record['reading_status']='DECLARED_RANGE_OR_STATUS_PRESERVED'
            if actual_role in ('failed_candidate','mirrored_candidate'):
                record['adopted_for_claims']=False
            rows.append(record)
    by_id={r['id']:r for r in rows}
    mirrors=[]
    for file,collection,targetfile,targetcollection in [
        ('west/evidence-disputes/literature.json','sources','west/evidence-disputes/sources.json','literature'),
        ('ROOT_SOURCE_REVIEW_9.json','entries','resource-lifecycle/sources.json','sources'),
        ('ROOT_SOURCE_REVIEW_9.json','failed_candidates','resource-lifecycle/sources.json','failed_candidates')]:
        a,b=catalogues[file][collection],catalogues[targetfile][targetcollection]
        assert a==b, 'mirror records differ: '+file
        for i in range(len(a)):
            source=file+'#/'+collection+'/'+str(i)
            target=targetfile+'#/'+targetcollection+'/'+str(i)
            mirrors.append({'record':source,'same_record_as':target,'relation':'EXACT_JSON_MIRROR',
                            'new_read_or_work_count':0})
            by_id[source]['same_record_as']=target
    base_url=catalogues[PREFIX+'url-index.json']
    union={}
    for i,item in enumerate(base_url['entries']):
        union[item['url']]={'url':item['url'],'kind':url_kind(item['url']),
            'C07_pointer':{'file':PREFIX+'url-index.json','file_sha256':sha((root/(PREFIX+'url-index.json')).read_bytes()),
                           'json_pointer':'/entries/'+str(i)},'later_occurrences':[]}
    for row in rows:
        for u in row['urls']:
            entry=union.setdefault(u['url'],{'url':u['url'],'kind':url_kind(u['url']),
                                            'C07_pointer':None,'later_occurrences':[]})
            entry['later_occurrences'].append({'record':row['id'],'url_binding':u,
                'role':row['role'],'is_mirror':'same_record_as' in row})
    urls=[union[u] for u in sorted(union)]
    for entry in urls:
        if entry['kind']!='external_http':
            entry['render_as_link']=False
            entry['interpretation']='Literal legacy address, scoped by the C07 originating catalogue; not relative to C11.'
    reading_links=[]
    for row in rows:
        if row['role']!='root_reopen':
            continue
        source_urls={x['url'] for x in row['urls']}
        source_ids={git_identity(x) for x in source_urls if git_identity(x)}
        matches=[]
        for other in rows:
            if other['role'] not in ('primary_declaration','fixed_code_reading','source_fingerprint'):
                continue
            other_urls={x['url'] for x in other['urls']}
            exact=source_urls & other_urls
            identity=source_ids & {git_identity(x) for x in other_urls if git_identity(x)}
            if exact or identity:
                matches.append({'record':other['id'],'relation':'EXACT_URL' if exact else 'SAME_FIXED_REF_PATH',
                                'reading_scope_not_overwritten':True})
        for url in sorted(source_urls):
            if union[url]['C07_pointer']:
                matches.append({'C07_url_entry':union[url]['C07_pointer'],'relation':'EXACT_URL',
                                'reading_scope_not_overwritten':True})
        reading_links.append({'root_observation':row['id'],'source_matches':matches,
                              'new_independent_work_count':0,'runtime_inferred':False})
    # Relations retain representation/version distinctions; they do not merge claims or reading scopes.
    relations=[]
    for row in rows:
        unique=sorted({u['url'] for u in row['urls']})
        if len(unique)>1:
            relations.append({'type':'CATALOGUE_DECLARED_REPRESENTATIONS','urls':unique,
                'record':row['id'],'not_proof_of_byte_identity':True,'not_merged_reading_scope':True})
    git_groups=defaultdict(list)
    for url in union:
        identity=git_identity(url)
        if identity:
            git_groups[identity].append(url)
    for (repo,ref,path),us in sorted(git_groups.items()):
        if len(us)>1:
            relations.append({'type':'SAME_REPOSITORY_REF_PATH_REPRESENTATIONS','repository':repo,
                'ref':ref,'path':path,'urls':sorted(us),'not_proof_of_byte_identity':True,
                'not_merged_reading_scope':True})
    fragments=defaultdict(list)
    for u in union:
        if u.startswith(('https://','http://')):
            fragments[u.split('#')[0]].append(u)
    for base,us in sorted(fragments.items()):
        if len(us)>1:
            relations.append({'type':'SAME_PAGE_DIFFERENT_FRAGMENT','base':base,'urls':sorted(us),
                              'not_merged_reading_scope':True})
    c07=catalogues[PREFIX+'source-index.json']
    baseline_external={u for u in union if union[u]['C07_pointer'] and url_kind(u)=='external_http'}
    later_external={u['url'] for r in rows for u in r['urls']}
    candidates={u['url'] for r in rows if r['role']=='failed_candidate' for u in r['urls']}
    roles=Counter(r['role'] for r in rows)
    fixed=sorted({git_identity(u) for u in later_external if git_identity(u)})
    counts={'C07_catalogues':len(c07['catalogs']),'C07_groups':len(c07['source_groups']),
        'C07_document_occurrences':len(c07['document_occurrences']),
        'C07_exact_address_keys':len(base_url['entries']),'C07_external_http_keys':len(baseline_external),
        'C07_legacy_non_http_keys':len(base_url['entries'])-len(baseline_external),
        'later_catalogue_files':len(set(s[0] for s in SPECS)),'later_record_occurrences':len(rows),
        'later_roles':dict(sorted(roles.items())),'exact_mirrored_records':len(mirrors),
        'later_literal_url_occurrences':sum(u['kind']=='literal' for r in rows for u in r['urls']),
        'later_constructed_url_occurrences':sum(u['kind']!='literal' for r in rows for u in r['urls']),
        'later_exact_http_keys_including_candidate':len(later_external),
        'later_exact_keys_already_in_C07':len(later_external&baseline_external),
        'later_exact_keys_absent_from_C07':len(later_external-baseline_external),
        'union_exact_address_keys':len(union),'union_external_http_keys':sum(u['kind']=='external_http' for u in urls),
        'union_legacy_non_http_keys':sum(u['kind']!='external_http' for u in urls),
        'later_failed_candidate_exact_urls':len(candidates),
        'later_repository_ref_path_identities':len(fixed),
        'later_full_commit_pinned_identities':sum(bool(re.fullmatch('[0-9a-f]{40}',x[1])) for x in fixed),
        'later_release_tag_identities':sum(not bool(re.fullmatch('[0-9a-f]{40}',x[1])) for x in fixed),
        'root_cross_review_observations_C07_plus_5_to_8':len(catalogues[PREFIX+'reading-observations.json']['root_observations'])+roles['root_reopen'],
        'root9_mirrored_primary_reads_not_added_again':roles['mirrored_primary_read'],
        'new_reads_by_C11':0,'new_products_tested_by_C11':0}
    manifest_obj={'schema_version':1,'captured_at_utc':captured,
        'C07_cutoff_utc':c07['captured_at_utc'],'inputs':manifest,
        'scope':'Explicit source catalogues only; navigation/readback is not new body reading.',
        'excluded':['raw source-inputs code/PDF bodies','execution and validation receipts',
                    'copies under other audits inputs/','research source citations embedded only in prose not a declared catalogue',
                    'future catalogues after this snapshot'],
        'all_paths_relative_to_research_root':True}
    redactable=[]
    def scan_paths(value, ptr, file):
        if isinstance(value,dict):
            for key,v in value.items():
                scan_paths(v,ptr+'/'+key.replace('~','~0').replace('/','~1'),file)
        elif isinstance(value,list):
            for i,v in enumerate(value):
                scan_paths(v,ptr+'/'+str(i),file)
        elif isinstance(value,str):
            kinds=[]
            if re.search(r'/(?:Users|home)/[^/\s]+',value): kinds.append('personal_home_path')
            if re.search(r'/(?:private/)?tmp/|/private/var/folders/',value): kinds.append('temporary_path')
            if kinds:
                redactable.append({'file':file,'json_pointer':ptr,'kinds':kinds,
                                   'original_value_intentionally_not_copied':True})
    for file in sorted(set(s[0] for s in SPECS)):
        scan_paths(catalogues[file],'',file)
    redaction={'schema_version':1,'scope':'pattern inventory of 14 later source catalogues; not a security audit',
        'original_catalogue_sha_references':'manifest.json','redactable_fields':redactable,
        'fields':len(redactable),'files':len({x['file'] for x in redactable}),
        'by_file':dict(sorted(Counter(x['file'] for x in redactable).items())),
        'implication':'Raw-copy portability is not redacted-package identity. Validate exact original SHA or a matching DERIVATION original/derived SHA pair.',
        'source_evidence_modified':False}
    supplemental={'schema_version':1,'captured_at_utc':captured,'records':rows,'exact_record_mirrors':mirrors,
        'reading_limits':['C11 verifies metadata identity/pointers, not source-body truth.',
            'Source fingerprint manifests without a reading range remain unspecified.',
            'W09/W12 are local archive/design reading history, excluded from external-article totals.',
            'W11 1977 original Belnap chapters remain unread; two 2018/2007 papers are selected sections.',
            'Failed Node.js living page is not adopted; fixed v24.6.0 GitHub document is a separate accepted entry.',
            'Search-only candidates without enumerated URLs cannot be assigned an invented count.']}
    representation={'schema_version':1,'relations':relations,
        'explicit_version_boundaries':[
            {'family':'MCP Tasks','separate_versions':['2025-11-25','2026-07-28'],
             'reason':'legacy core/requestor-directed and newer extension scope must not be conflated'},
            {'family':'A2A','separate_versions':['v0.3.0','v1.0.1'],
             'reason':'legacy resubscribe and v1 task subscriptions are different versioned contracts'},
            {'family':'A2A v1.0.1','separate_files':['docs/specification.md','specification/a2a.proto'],
             'reason':'same-release POST/GET subscription-binding difference preserved; not duplicate identical text'}],
        'no_unique_article_or_paper_total_claimed':True}
    outputs={'manifest.json':manifest_obj,'supplement-index.json':supplemental,
             'union-url-index.json':{'schema_version':1,'equality':'literal exact address; fragments preserved',
                                     'entries':urls},'representation-relations.json':representation,
             'reading-relations.json':{'schema_version':1,'root_reading_matches':reading_links,
                                       'exact_record_mirrors':mirrors},'counts.json':counts,
             'redaction-impact.json':redaction}
    for name,obj in outputs.items():
        text=json.dumps(obj,ensure_ascii=False,indent=2)+'\n'
        assert not re.search(r'/(Users|home)/',text),name
        (HERE/name).write_text(text)
    print(json.dumps({'status':'PASS','captured_at_utc':captured,'counts':counts},ensure_ascii=False,indent=2))


if __name__=='__main__':
    main()
