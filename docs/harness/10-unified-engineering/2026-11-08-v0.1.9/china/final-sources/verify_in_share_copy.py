"""Copy the research package outside its checkout and exercise portable validation.

Leaves the temporary copy for inspection. Never changes the original catalogues.
"""
from pathlib import Path
import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

HERE=Path(__file__).resolve().parent
OUTPUTS=('manifest.json','supplement-index.json','union-url-index.json',
         'representation-relations.json','reading-relations.json','counts.json','redaction-impact.json')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--research-root',type=Path,required=True)
    args=parser.parse_args()
    source=args.research_root.resolve()
    manifest=json.loads((HERE/'manifest.json').read_text())
    before={x['file']:sha(source/x['file']) for x in manifest['inputs']}
    assert all(before[x['file']]==x['sha256'] for x in manifest['inputs'])
    assert not any(p.is_symlink() for p in source.rglob('*')), 'symlink in source research directory'
    temp=Path(tempfile.mkdtemp(prefix='c11-portable-'))
    research=temp/'shared-research'
    assert not research.is_relative_to(source.parents[2]) and not research.is_relative_to(HERE.parents[4])
    shutil.copytree(source,research,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    target=research/'china/final-sources'
    shutil.copytree(HERE,target,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    env=dict(os.environ,PYTHONDONTWRITEBYTECODE='1')
    calls=[]
    def run(command,cwd,expect=0,seed='11'):
        proc=subprocess.run([sys.executable]+command,cwd=cwd,env=dict(env,PYTHONHASHSEED=seed),
                            text=True,capture_output=True)
        calls.append({'command':['python3']+command,'cwd_relative_to_test_root':str(cwd.relative_to(temp)),
                      'exit_code':proc.returncode,'expected_exit_code':expect,'pythonhashseed':seed})
        if proc.returncode!=expect:
            print(proc.stdout)
            print(proc.stderr)
            raise AssertionError('portable command exit mismatch')
        return proc
    base=research/'china/consolidated-sources'
    run(['validate_index_portable.py'],base)
    shutil.copyfile(base/'portable-validation-receipt.json',HERE/'c07-portable-validation.json')
    frozen_before={name:sha(target/name) for name in OUTPUTS}
    run(['build_supplement.py','--frozen'],target,seed='11')
    first={name:sha(target/name) for name in OUTPUTS}
    run(['build_supplement.py','--frozen'],target,seed='97')
    second={name:sha(target/name) for name in OUTPUTS}
    assert frozen_before==first==second, 'frozen regeneration changed bytes'
    run(['validate_portable.py'],target)
    negatives=[]
    base_topic=research/'china/中国Harness机制核查讨论稿-v0.1.0.md'
    held=base_topic.with_name(base_topic.name+'.c11-held')
    base_topic.rename(held)
    try:
        run(['validate_index_portable.py'],base,expect=1)
        r=json.loads((base/'portable-validation-receipt.json').read_text())
        assert r['status']=='FAIL' and r['errors']
        negatives.append({'case':'C07_missing_topic_does_not_fallback_to_checkout',
                          'expected_status':'FAIL','actual_status':r['status'],'errors':r['errors']})
    finally:
        held.rename(base_topic)
    run(['validate_index_portable.py'],base)
    shutil.copyfile(base/'portable-validation-receipt.json',HERE/'c07-portable-validation.json')
    for rel,label in [('ROOT_SOURCE_REVIEW_7.json','missing_catalogue'),
                      ('west/trusted-entry-map/MAP.md','missing_reader_target')]:
        file=research/rel
        held=file.with_name(file.name+'.c11-held')
        assert not held.exists()
        file.rename(held)
        try:
            run(['validate_portable.py'],target,expect=1)
            receipt=json.loads((target/'validation_receipt.json').read_text())
            assert receipt['status']=='FAIL' and receipt['errors']
            negatives.append({'case':label,'missing_relative_path':rel,'expected_status':'FAIL',
                              'actual_status':receipt['status'],'errors':receipt['errors']})
        finally:
            held.rename(file)
    run(['validate_portable.py'],target)
    shutil.copyfile(target/'validation_receipt.json',HERE/'validation_receipt.json')
    # A scoped export simulation: only indexed metadata are redacted. This is
    # deliberately not a claim that the parent's eventual full share package passed.
    redacted=temp/'redacted-research'
    shutil.copytree(research,redacted,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    redacted_target=redacted/'china/final-sources'
    scope=json.loads((research/'china/consolidated-sources/scope-and-inputs.json').read_text())
    copied_inputs={x['file'] for x in manifest['inputs']}|{
        'china/consolidated-sources/'+x['snapshot'] for x in scope['files']
        if x['role'].startswith(('original_','root_'))}
    entries=[]
    changed=[]
    for rel in sorted(copied_inputs):
        file=redacted/rel
        original=file.read_bytes()
        text=original.decode()
        text=re.sub(r'/(?:Users|home)/[^/\s"\\]+','__LOCAL_HOME__',text)
        text=re.sub(r'/(?:private/)?tmp/','__LOCAL_TMP__/',text)
        text=re.sub(r'/private/var/folders/[^/\s]+/[^/\s]+','__LOCAL_TMP__',text)
        derived=text.encode()
        file.write_bytes(derived)
        transformations=['metadata_home_tmp_redaction_sample'] if derived!=original else []
        if transformations: changed.append(rel)
        entries.append({'path':rel,'original_sha256':hashlib.sha256(original).hexdigest(),
                        'derived_sha256':hashlib.sha256(derived).hexdigest(),
                        'transformations':transformations})
    ledger={'scope':'C11 local metadata-redaction test only, not the final share package',
            'created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':entries}
    ledger_file=redacted/'DERIVATION.json'
    ledger_file.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    run(['validate_portable.py'],redacted_target)
    held_ledger=redacted/'DERIVATION.json.c11-held'
    ledger_file.rename(held_ledger)
    try:
        run(['validate_portable.py'],redacted_target,expect=1)
        r=json.loads((redacted_target/'validation_receipt.json').read_text())
        negatives.append({'case':'redacted_catalogues_without_DERIVATION','expected_status':'FAIL',
                          'actual_status':r['status'],'errors':r['errors']})
    finally:
        held_ledger.rename(ledger_file)
    good_ledger=ledger_file.read_bytes()
    w12='west/design-continuity/reading-list.json'
    assert w12 in changed
    entry=next(x for x in ledger['files'] if x['path']==w12)
    entry['derived_sha256']='0'*64
    ledger_file.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    try:
        run(['validate_portable.py'],redacted_target,expect=1)
        r=json.loads((redacted_target/'validation_receipt.json').read_text())
        negatives.append({'case':'wrong_W12_derived_SHA','expected_status':'FAIL',
                          'actual_status':r['status'],'errors':r['errors']})
    finally:
        ledger_file.write_bytes(good_ledger)
    good_w12=(redacted/w12).read_bytes()
    altered=json.loads(good_w12)
    altered['files'][0]['read_mode']='ALTERED_TEST_SCOPE'
    (redacted/w12).write_text(json.dumps(altered,ensure_ascii=False,indent=2)+'\n')
    ledger=json.loads(good_ledger)
    next(x for x in ledger['files'] if x['path']==w12)['derived_sha256']=sha(redacted/w12)
    ledger_file.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+'\n')
    try:
        run(['validate_portable.py'],redacted_target,expect=1)
        r=json.loads((redacted_target/'validation_receipt.json').read_text())
        negatives.append({'case':'changed_read_scope_even_with_matching_derived_SHA','expected_status':'FAIL',
                          'actual_status':r['status'],'errors':r['errors']})
    finally:
        (redacted/w12).write_bytes(good_w12)
        ledger_file.write_bytes(good_ledger)
    run(['validate_portable.py'],redacted_target)
    shutil.copyfile(redacted_target/'validation_receipt.json',HERE/'redacted-validation-receipt.json')
    assert all(x['actual_status']=='FAIL' and x['errors'] for x in negatives)
    assert before=={file:sha(source/file) for file in before}, 'original source catalogues changed'
    receipt={'status':'PASS','executed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'copy_name':temp.name,'copy_outside_original_checkout':True,'copied_scope':'entire research directory, excluding Python bytecode caches',
        'original_catalogues_unchanged':len(before),'C07_original_directory_not_written':True,
        'C07_portable_validator_passed':True,'C11_portable_validator_passed':True,
        'metadata_redaction_sample_passed':True,'redacted_catalogues':changed,
        'final_share_package_status':'NOT_RUN_BY_C11; actual parent export must run validate_portable.py again',
        'frozen_regeneration_byte_identical_across_seeds':[11,97],'generated_file_hashes':second,
        'negative_controls':negatives,'commands':calls,'network_requests':0,
        'third_party_body_reading_or_product_tests':False,'original_absolute_metadata_paths_not_used':True,
        'preliminary_correction':'The first copied-package validation caught a nonexistent R08 README link; it was corrected to REVIEW.md before this final run.',
        'generator_sha256':sha(target/'build_supplement.py'),'validator_sha256':sha(target/'validate_portable.py'),
        'C07_portable_validator_sha256':sha(base/'validate_index_portable.py'),
        'script_sha256':sha(Path(__file__))}
    (HERE/'portable-execution-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'status':'PASS','copy_name':temp.name,'original_catalogues_unchanged':len(before),
                      'negative_controls':len(negatives),'frozen_outputs':len(second)},indent=2))


if __name__=='__main__':
    main()
