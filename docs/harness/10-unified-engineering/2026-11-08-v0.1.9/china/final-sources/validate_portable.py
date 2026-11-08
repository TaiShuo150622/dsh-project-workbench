"""Offline C11 verification. Never falls back to an original checkout path."""
from pathlib import Path
from collections import Counter
import argparse
import datetime
import hashlib
import json
import re
import sys
from urllib.parse import unquote
sys.dont_write_bytecode=True
import build_supplement as b

HERE=Path(__file__).resolve().parent


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--research-root',type=Path,default=HERE.parents[1])
    args=parser.parse_args()
    root=args.research_root.resolve()
    errors=[]
    checked=Counter()
    def check(ok, why):
        checked['conditions']+=1
        if not ok:
            errors.append(why)
    def read(path):
        return json.loads(path.read_text())
    manifest=read(HERE/'manifest.json')
    catalogues={}
    derivation_path=root/'DERIVATION.json'
    derivations={}
    identity_bindings=[]
    if derivation_path.is_file():
        ledger=read(derivation_path)
        for entry in ledger.get('files',[]):
            check(entry['path'] not in derivations,'duplicate DERIVATION path: '+entry['path'])
            derivations[entry['path']]=entry
    def check_identity(file,data,expected):
        actual=b.sha(data)
        entry=derivations.get(file)
        if entry:
            ok=(entry.get('original_sha256')==expected and entry.get('derived_sha256')==actual)
            check(ok,'DERIVATION identity mismatch: '+file)
            kind='derived_identity' if actual!=expected else 'unchanged_with_derivation'
        else:
            ok=actual==expected
            check(ok,'changed input without matching DERIVATION: '+file)
            kind='original_identity'
        identity_bindings.append({'file':file,'expected_original_sha256':expected,
                                  'actual_sha256':actual,'binding':kind,'matched':ok})
        return ok
    def source(file):
        p=(root/file).resolve()
        check(p.is_relative_to(root),'source escapes supplied research root: '+file)
        return p
    for item in manifest['inputs']:
        path=source(item['file'])
        if not path.is_file():
            check(False,'missing frozen input: '+item['file'])
            continue
        data=path.read_bytes()
        check_identity(item['file'],data,item['sha256'])
        catalogues[item['file']]=json.loads(data)
        checked['input_hashes']+=1
    if errors:
        finish(errors,checked,manifest)
        return
    by_origin={f['file']:f for f in manifest['inputs']}
    def resolve(origin):
        check(origin['file_sha256']==by_origin[origin['file']]['sha256'],'origin SHA mismatch')
        checked['pointer_resolutions']+=1
        return b.pointer(catalogues[origin['file']],origin['json_pointer'])
    # The old index's own frozen inputs retain their original bytes and pointers.
    for item in catalogues[b.PREFIX+'scope-and-inputs.json']['files']:
        if item['role'].startswith(('original_','root_')):
            path=source(b.PREFIX+item['snapshot'])
            check(path.is_file(),'C07 missing snapshot: '+item['file'])
            if path.is_file():
                check_identity(b.PREFIX+item['snapshot'],path.read_bytes(),item['sha256'])
            checked['C07_frozen_input_hashes']+=1
    index=read(HERE/'supplement-index.json')
    rows={r['id']:r for r in index['records']}
    check(len(rows)==len(index['records']),'duplicate later record id')
    expected={file+'#/'+collection+'/'+str(i)
              for file,collection,_,_ in b.SPECS for i in range(len(catalogues[file][collection]))}
    check(set(rows)==expected,'catalogue row coverage mismatch')
    for row in rows.values():
        original=resolve(row['origin'])
        check(row['original_id']==original.get('id'),'original id mismatch: '+row['id'])
        for name,fields in [('reading_declaration',b.READING),('version_binding',b.VERSIONS),
                            ('claims',b.CLAIMS),('limitations',b.LIMITS),('attribution',b.ATTRIBUTION),('dates',b.DATES)]:
            expected_fields=b.pick(original,fields)
            for omitted in row['omitted_fields'].get(name,[]):
                expected_fields.pop(omitted,None)
            check(all(row[name].get(k)==v for k,v in expected_fields.items()),name+' changed: '+row['id'])
        check(row['runtime_not_inferred'] and row['reading_not_newly_verified_by_C11'],'scope overclaim')
        for u in row['urls']:
            if u['kind']=='literal':
                check(b.pointer(catalogues[row['origin']['file']],u['origin_pointer'])==u['url'],'literal URL pointer')
                checked['literal_URL_pointers']+=1
            else:
                commit,path=original['source'].split(':',2)[1:]
                check(u['derivation']['commit']==commit and u['derivation']['path']==path,'constructed file derivation')
                check(u['url']==f"https://github.com/{u['derivation']['repository']}/blob/{commit}/{path}",'constructed URL')
                checked['constructed_URLs']+=1
        checked['later_records']+=1
    for mirror in index['exact_record_mirrors']:
        check(resolve(rows[mirror['record']]['origin'])==resolve(rows[mirror['same_record_as']]['origin']),
              'false exact mirror')
        check(mirror['new_read_or_work_count']==0,'mirror counted as new read')
        checked['exact_mirrors']+=1
    union=read(HERE/'union-url-index.json')['entries']
    uby={u['url']:u for u in union}
    expected_urls={u['url'] for u in catalogues[b.PREFIX+'url-index.json']['entries']}|{
        u['url'] for row in rows.values() for u in row['urls']}
    check(set(uby)==expected_urls and len(uby)==len(union),'union URL coverage')
    for item in union:
        if item['C07_pointer']:
            check(resolve(item['C07_pointer'])['url']==item['url'],'C07 URL pointer')
        for occurrence in item['later_occurrences']:
            row=rows[occurrence['record']]
            check(occurrence['url_binding'] in row['urls'],'URL occurrence not in source record')
        if item['kind']!='external_http':
            check(item['render_as_link'] is False,'legacy relative address incorrectly rendered as C11 link')
    for rel in read(HERE/'representation-relations.json')['relations']:
        check(all(u in uby for u in rel['urls']),'representation unknown URL')
        if rel['type']=='SAME_REPOSITORY_REF_PATH_REPRESENTATIONS':
            check(len({b.git_identity(u) for u in rel['urls']})==1,'false fixed-file alias')
        elif rel['type']=='CATALOGUE_DECLARED_REPRESENTATIONS':
            check(set(rel['urls'])=={u['url'] for u in rows[rel['record']]['urls']},'false declared representation')
        elif rel['type']=='SAME_PAGE_DIFFERENT_FRAGMENT':
            check(all(u.split('#')[0]==rel['base'] for u in rel['urls']),'false fragment relation')
        check(rel['not_merged_reading_scope'],'representation merged reading scope')
        checked['representation_relations']+=1
    for relation in read(HERE/'reading-relations.json')['root_reading_matches']:
        row=rows[relation['root_observation']]
        source_urls={u['url'] for u in row['urls']}
        check(row['role']=='root_reopen' and relation['new_independent_work_count']==0,'root role changed')
        for match in relation['source_matches']:
            target_urls={u['url'] for u in rows[match['record']]['urls']} if 'record' in match else {resolve(match['C07_url_entry'])['url']}
            if match['relation']=='EXACT_URL':
                check(bool(source_urls&target_urls),'false root exact read match')
            else:
                check(bool({b.git_identity(u) for u in source_urls if b.git_identity(u)} &
                           {b.git_identity(u) for u in target_urls if b.git_identity(u)}),'false root fixed ref match')
            check(match['reading_scope_not_overwritten'],'root scope overwrote author scope')
        checked['root_read_relations']+=1
    for name in ('README.md','SOURCE_INDEX.md','COUNTING.md'):
        for target in re.findall(r'\]\(([^)]+)\)',(HERE/name).read_text()):
            if target.startswith(('https://','http://','#')):
                continue
            check(not target.startswith('/'),'absolute reader link: '+name)
            path=(HERE/unquote(target.split('#')[0])).resolve()
            check(path.is_relative_to(root),'reader link escapes research package: '+name+' -> '+target)
            check(path.exists() or path.name in ('validation_receipt.json','redacted-validation-receipt.json','portable-execution-receipt.json','SHA256SUMS'),
                  'missing reader link: '+name+' -> '+target)
            checked['reader_links']+=1
    for file in HERE.iterdir():
        if file.suffix not in ('.py','.json','.md'):
            continue
        check(not re.search(r'/(?:Users|home)/[A-Za-z0-9_.-]+',file.read_text()),'personal absolute path in '+file.name)
    counts=read(HERE/'counts.json')
    check(counts['later_record_occurrences']==len(rows),'record count')
    check(counts['union_exact_address_keys']==len(uby),'union count')
    check(counts['union_external_http_keys']==sum(u.startswith(('http://','https://')) for u in uby),'HTTP count')
    check(counts['later_roles']==dict(sorted(Counter(r['role'] for r in rows.values()).items())),'role counts')
    finish(errors,checked,manifest,identity_bindings,
           b.sha(derivation_path.read_bytes()) if derivation_path.is_file() else None)


def finish(errors,checked,manifest,identity_bindings=None,derivation_sha256=None):
    receipt={'status':'FAIL' if errors else 'PASS','validated_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
             'capture_cutoff_utc':manifest['captured_at_utc'],'checks':dict(checked),'errors':errors,
             'script_sha256':b.sha(Path(__file__).read_bytes()),'manifest_sha256':b.sha((HERE/'manifest.json').read_bytes()),
             'no_checkout_fallback':True,'all_input_paths_bounded_by_supplied_root':True,
             'network_requests':0,'source_body_truth_not_reverified':True,'product_tests_run':False}
    receipt['identity_bindings']=identity_bindings or []
    receipt['derivation_manifest_sha256']=derivation_sha256
    receipt['derivation_boundary']='Exact hash-chain consistency and retained-field comparison only; unsigned DERIVATION is not independent authentication or proof that redaction policy is complete.'
    (HERE/'validation_receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(receipt,ensure_ascii=False,indent=2))
    if errors:
        raise SystemExit(1)


if __name__=='__main__':
    main()
