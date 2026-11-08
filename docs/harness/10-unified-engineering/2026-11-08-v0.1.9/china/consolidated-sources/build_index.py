"""C-07 offline reader index. Writes this directory only; preserves C-05 snapshot.
Documents, assertions, reads, identity evidence and bibliographic enrichment stay separate.
"""
from pathlib import Path
from collections import Counter,defaultdict
from urllib.parse import urldefrag,quote
import json,hashlib,datetime,re,sys
OUT=Path(__file__).resolve().parent
FROZEN=len(sys.argv)>1 and sys.argv[1]=='--frozen'
ROOT=OUT/'inputs' if FROZEN else Path(sys.argv[1]).resolve() if len(sys.argv)>1 else OUT.parents[5]/'integration/docs/research/harness-20261107'
RUN_START=datetime.datetime.now(datetime.timezone.utc).isoformat()
START=json.loads((OUT/'source-index.json').read_text())['captured_at_utc'] if FROZEN else RUN_START
frozen_census=json.loads((OUT/'scope-and-inputs.json').read_text())['files'] if FROZEN else None
sha=lambda b:hashlib.sha256(b).hexdigest()
write=lambda n,v:(OUT/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
select=lambda o,keys:{k:o[k] for k in keys if k in o}
def pointer(doc,p):
 for part in p.strip('/').split('/'):
  part=part.replace('~1','/').replace('~0','~');doc=doc[int(part)] if isinstance(doc,list) else doc[part]
 return doc
ATTR=['organization_or_author','author_organization','author_or_institution','authors_or_organization','authors','organization','publisher','company','attribution']
READ=['retrieval_status','evidence_status','body_status','read_status','verification','validation','read_scope','read','reading_coverage','read_by','not_read']
LOC=['anchors','line_ranges','locators','locator','location','lines','ranges','read_scope','read','reading_coverage']
VERS=['repository','repo','commit','baseline_commit','blob','snapshot_commit_at','commit_date','path','file','version','version_date','specification_version','content_as_of','revision_date','last_substantive_update','pdf_sha256','raw_file_sha256','remote_commit_availability']
DATES=['published_at','publication_date','published_date','published','date','date_kind','date_note','date_basis','publication_date_basis','accessed_at','accessed_date','accessed_at_utc','page_date','render_date']
CLAIMS=['supported_claims','claims','supports','claim']
LIMIT=['limitations','limits','limit','attribution_limit','attribution_locator','used_as_company_promise']
NATURE=['category','kind','evidence_type','type','view_category']
CATREAD=['method','evidence_status','evidence_policy','status','coverage_note','limits','source_policy','actual_execution','runtime_experiments_run','unverified','uncertainty','count_note']
census=[];loaded={};catalogs=[];review_files=[];supp_files=[]
for path in sorted(ROOT.rglob('*.json')):
 rel=str(path.relative_to(ROOT));raw=path.read_bytes()
 try:d=json.loads(raw)
 except Exception as e:census.append({'file':rel,'sha256':sha(raw),'role':'invalid_json','error':str(e)});continue
 if 'inputs' in path.relative_to(ROOT).parts:role='excluded_frozen_input'
 elif path.name=='sources.json' and isinstance(d,dict) and isinstance(d.get('sources',d.get('groups')),list):role='original_source_catalog'
 elif path.name.startswith('ROOT_SOURCE_REVIEW') and isinstance(d,dict) and isinstance(d.get('entries'),list):role='root_read_observations'
 elif path.name=='ROOT_BIBLIOGRAPHY_SUPPLEMENT.json':role='root_bibliography_enrichment'
 else:role='excluded_non_source_artifact'
 item={'file':rel,'sha256':sha(raw),'bytes':len(raw),'role':role}
 census.append(item)
 if role.startswith(('original_','root_')):
  dest=OUT/'inputs'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
  item['snapshot']='inputs/'+rel;loaded[rel]=d
  if role=='original_source_catalog':catalogs.append((rel,d,item))
  elif role=='root_read_observations':review_files.append((rel,d,item))
  else:supp_files.append((rel,d,item))
groups=[];docs=[];identity=[];views=[];candidates=[];aux_urls=[];issues=[]
def address(rel,item,p):return {'file':rel,'file_sha256':item['sha256'],'json_pointer':p}
def add_doc(rel,item,g,doc,p,role,url=None,url_origin='literal_url',binding=None):
 u=url if url is not None else doc.get('url')
 record={'id':rel+'#'+p,'source_group_id':g['id'],'origin':address(rel,item,p),'document_role':role,
  'title':doc.get('title') or g['title'],'url':u,'url_origin':url_origin,
  'url_is_literal_in_source':url_origin=='literal_url','locators':select(doc,LOC),
  'version_binding':{**g['version_binding'],**(binding or {}),**select(doc,VERS)},
  'document_claims':select(doc,CLAIMS),'group_claims_reference':g['id'],
  'reading_declaration':select(doc,READ),'group_reading_reference':g['id'],
  'not_a_new_runtime_test':True}
 if role=='pinned_repository_file':record['remote_availability']='NOT_CHECKED_BY_THIS_INDEX; see original retrieval and availability declarations'
 docs.append(record)
 return record

def walk_urls(obj,p=''):
 if isinstance(obj,dict):
  for k,v in obj.items():yield from walk_urls(v,p+'/'+str(k).replace('~','~0').replace('/','~1'))
 elif isinstance(obj,list):
  for i,v in enumerate(obj):yield from walk_urls(v,p+'/'+str(i))
 elif isinstance(obj,str) and re.fullmatch(r'https?://\S+',obj):yield p,obj
for rel,d,item in catalogs:
 key='sources' if 'sources' in d else 'groups';items=d[key]
 if 'source_group_count' in d and d['source_group_count']!=len(items):issues.append({'kind':'declared_group_count_mismatch','file':rel})
 local_ids={x.get('id'):rel+'#/'+key+'/'+str(i) for i,x in enumerate(items)}
 for i,s in enumerate(items):
  p='/'+key+'/'+str(i);uid=rel+'#'+p
  read=select(s,READ);claims=select(s,CLAIMS)
  unreachable='inaccessible' in str(s.get('retrieval_status','')).lower()
  nested_retrieval=any(isinstance(s.get(k),dict) and s[k].get('retrieval') and s[k].get('files') for k in ('workbench','dsh'))
  status='EXPLICIT_BODY_UNAVAILABLE_UNADOPTED' if unreachable and not any(claims.values()) else 'ENTRY_READING_SCOPE_DECLARED' if read else 'NESTED_FILE_RETRIEVAL_AND_RANGES_DECLARED' if nested_retrieval else 'CATALOG_SCOPE_ONLY; ITEM_READ_STATUS_UNSPECIFIED'
  loc=select(s,LOC)
  claimloc=[c['locator'] for c in s.get('claims',[]) if isinstance(c,dict) and 'locator' in c]
  if claimloc:loc['claim_locators']=claimloc
  g={'id':uid,'original_id':s.get('id'),'origin':address(rel,item,p),'catalog_schema_collection':key,
   'title':s.get('title'),'attribution':select(s,ATTR),'evidence_nature':select(s,NATURE),'dates':select(s,DATES),
   'catalog_dates':select(d,['accessed_at','accessed_date','accessed_at_utc','as_of','created_at','generated_at_utc']),
   'claims':claims,'limitations':select(s,LIMIT),'locators':loc,'version_binding':select(s,VERS),
   'code_binding':s.get('code'),'reading_status':status,'entry_reading_declarations':read,
   'catalog_reading_declarations':select(d,CATREAD),'document_ids':[],
   'metadata_not_explicit_at_group_level':[label for label,fields in [('attribution',ATTR),('evidence_nature',NATURE),('publication_date',['published_at','publication_date','published_date','published']),('reading_scope',READ)] if not select(s,fields)]}
  before=len(docs)
  if s.get('url'):add_doc(rel,item,g,s,p,'main_source')
  for j,u in enumerate(s.get('urls',[])):add_doc(rel,item,g,s,p+'/urls/'+str(j),'explicit_url_list_document',u)
  for j,sub in enumerate(s.get('primary_documents',[])):add_doc(rel,item,g,sub,p+'/primary_documents/'+str(j),'explicit_primary_document')
  if isinstance(s.get('paired_file'),dict):add_doc(rel,item,g,s['paired_file'],p+'/paired_file','explicit_paired_document')
  for scope in ('workbench','dsh'):
   if not isinstance(s.get(scope),dict):continue
   b=s[scope]
   for j,f in enumerate(b.get('files',[])):
    u=f.get('url');u_origin='literal_url'
    if not u:
     if b.get('permalink_prefix'):u=b['permalink_prefix']+quote(f['path'],safe='/');u_origin='constructed_from_explicit_permalink_prefix_and_path'
     elif b.get('repository') and b.get('commit'):u='https://github.com/'+b['repository']+'/blob/'+b['commit']+'/'+quote(f['path'],safe='/');u_origin='constructed_from_explicit_repository_commit_path'
    doc=add_doc(rel,item,g,f,p+'/'+scope+'/files/'+str(j),'pinned_repository_file',u,u_origin,select(b,VERS))
    doc['repository_scope']=scope;doc['source_retrieval_declaration']=b.get('retrieval')
    doc['attribution_scope']={'repository':b.get('repository'),'group_authors_not_assigned_individually':True}
  g['document_ids']=[x['id'] for x in docs[before:]];groups.append(g)
  if unreachable:candidates.append({'origin':g['origin'],'group_id':uid,'status':status,'url':s.get('url'),'claims_adopted':False,'declaration':select(s,['retrieval_status','limitations'])})
  for field in ('affiliation_sources','identity_sources'):
   for idref in s.get(field,[]):
    target=local_ids.get(idref)
    identity.append({'subject_group':uid,'relation':field,'target_original_id':idref,'target_group':target,'self_reference':target==uid,'role':'dated_identity_evidence; not current employment or company endorsement'})
    if target is None:issues.append({'kind':'unresolved_identity_id','source':uid,'id':idref})
  for field in ('identity_basis','affiliations_from_pdf_title_page'):
   if field in s:identity.append({'subject_group':uid,'relation':field,'inline_evidence':s[field],'role':'dated_identity_evidence; not current employment or individual endorsement'})
  if str(s.get('category','')).startswith('employee_') and s.get('affiliation_sources'):
   views.append({'id':uid+'/view','origin_type':'china_opinion_entry','opinion_group':uid,'identity_groups':[local_ids.get(x) for x in s['affiliation_sources']],'person_or_original_author_label':s.get('organization_or_author'),'category':s['category'],'dates':select(s,DATES),'limitations':s.get('limitations'),'do_not_promote_to_company_contract':True})
 for j,v in enumerate(d.get('views',[])):
  views.append({'id':rel+'#/views/'+str(j),'origin_type':'explicit_view_group','raw_view':v,'source_groups':[local_ids.get(x) for x in v.get('source_ids',[])],'joint_vs_personal_status_preserved':True})
 for section in ('access_failures','excluded_candidates'):
  for j,c in enumerate(d.get(section,[])):candidates.append({'origin':address(rel,item,'/'+section+'/'+str(j)),'status':'EXCLUDED_CANDIDATE' if section=='excluded_candidates' else 'ACCESS_FAILED_NOT_READ','claims_adopted':False,'declaration':c,'url':c.get('url')})
 for p,u in walk_urls(d):aux_urls.append({'origin':address(rel,item,p),'url':u,'purpose':'literal_catalog_URL; may be document, identity, permalink prefix, alternative or excluded candidate'})

# Reads are distinct from their referenced URL and bibliographic description.
def arxiv(u):
 m=re.match(r'^https?://arxiv\.org/(?:abs|html|pdf)/(\d+\.\d+)(v\d+)?(?:\.pdf)?$',urldefrag(u or '')[0])
 return (m[1],m[2] or 'UNVERSIONED') if m else None
reads=[]
for rel,d,item in review_files:
 for j,r in enumerate(d['entries']):
  matches=[];related=[];url=r.get('url')
  for doc in docs:
   if url==doc['url']:matches.append({'document_id':doc['id'],'relation':'EXACT_URL','constructed_document_URL':not doc['url_is_literal_in_source']})
   elif url and doc['url'] and urldefrag(url)[0]==urldefrag(doc['url'])[0]:matches.append({'document_id':doc['id'],'relation':'SAME_URL_WITHOUT_FRAGMENT; READING_SCOPE_SEPARATE'})
   elif arxiv(url) and arxiv(url)==arxiv(doc['url']):related.append({'document_id':doc['id'],'relation':'SAME_ARXIV_WORK_AND_VERSION_DIFFERENT_REPRESENTATION; NO_BODY_EQUIVALENCE_CHECK'})
  # M-05 dynamic main URL has fixed source permalink; link its original group without copying the read.
  for a in aux_urls:
   if a['url']==url and (a['origin']['json_pointer'].endswith('/permalink') or a['origin']['json_pointer'].endswith('/full_text_url') or a['origin']['json_pointer'].endswith('/pdf_url')):
    matches.append({'original_URL_pointer':a['origin'],'relation':'EXACT_ALTERNATE_URL; READING_SCOPE_SEPARATE'})
  reads.append({'id':rel+'#/entries/'+str(j),'origin':address(rel,item,'/entries/'+str(j)),'original_review_id':r.get('id'),'reviewer':'root_additional_read_observation','url':url,'dates':select(r,DATES) or select(d,DATES),'locations':select(r,LOC),'version_binding':select(r,VERS),'status':r.get('status'),'note':r.get('root_review_note'),'runtime_tested':r.get('runtime_tested'),'blob_sha':r.get('blob_sha'),'document_matches':matches,'related_work':related,'bibliography_enrichment_ids':[],'never_overwrites_author_read_status':True})
enrichments=[]
for rel,d,item in supp_files:
 for j,s in enumerate(d.get('entries',[])):
  matches=[r for r in reads if r['original_review_id']==s.get('review_id') and r['url']==s.get('url')]
  eid=rel+'#/entries/'+str(j)
  e={'id':eid,'origin':address(rel,item,'/entries/'+str(j)),'role':'BIBLIOGRAPHIC_ENRICHMENT_ONLY','not_new_source_or_reading':True,'review_ids':[r['id'] for r in matches],'fields':s}
  enrichments.append(e)
  for r in matches:r['bibliography_enrichment_ids'].append(eid)
  if len(matches)!=1:issues.append({'kind':'bibliography_enrichment_review_match_not_unique','id':eid,'matches':len(matches)})
root_only=[r for r in reads if not r['document_matches'] and not r['related_work']]
urls=defaultdict(lambda:{'document_occurrences':[],'root_read_observations':[],'bibliography_enrichments':[],'literal_in_catalog':False,'constructed_only':True})
for d in docs:
 if d['url']:
  u=urls[d['url']];u['document_occurrences'].append(d['id']);u['literal_in_catalog']|=d['url_is_literal_in_source'];u['constructed_only']&=not d['url_is_literal_in_source']
for r in reads:
 if r['url']:urls[r['url']]['root_read_observations'].append(r['id']);urls[r['url']]['constructed_only']=False
for e in enrichments:
 if e['fields'].get('url'):urls[e['fields']['url']]['bibliography_enrichments'].append(e['id'])
literal_docs=[d for d in docs if d['url_is_literal_in_source']];derived_docs=[d for d in docs if not d['url_is_literal_in_source']]
if FROZEN:
 original_included={x['file']:x['sha256'] for x in frozen_census if x['role'].startswith(('original_','root_'))}
 current_included={x['file']:x['sha256'] for x in census if x['role'].startswith(('original_','root_'))}
 if original_included!=current_included:raise SystemExit('Frozen input set or hashes differ from original capture')
 census=frozen_census
summary={'original_catalog_files':len(catalogs),'catalog_group_records':len(groups),'source_collection_groups':sum(g['catalog_schema_collection']=='sources' for g in groups),'m06_groups':sum(g['catalog_schema_collection']=='groups' for g in groups),'document_occurrences':len(docs),'literal_document_URL_occurrences':len(literal_docs),'constructed_pinned_file_links':len(derived_docs),'literal_document_exact_URL_unique':len({d['url'] for d in literal_docs}),'all_document_exact_URL_unique_including_constructed':len({d['url'] for d in docs if d['url']}),'root_review_files':len(review_files),'root_review_observations':len(reads),'root_only_URL_entities':len({r['url'] for r in root_only}),'bibliography_enrichment_records':len(enrichments),'new_readings_from_bibliography_supplement':0,'combined_exact_URL_keys_including_constructed_and_root':len(urls),'candidate_records_including_failed_and_excluded':len(candidates),'unadopted_candidate_inside_catalog_groups':sum(g['reading_status']=='EXPLICIT_BODY_UNAVAILABLE_UNADOPTED' for g in groups),'author_item_reading_status_counts':dict(Counter(g['reading_status'] for g in groups)),'m06_repository_files':dict(Counter(d.get('repository_scope') for d in derived_docs if d['document_role']=='pinned_repository_file')),'identity_relationships':len(identity),'opinion_or_authorship_view_groups':len(views),'total_JSON_files_seen':len(census),'excluded_frozen_input_JSON':sum(x['role']=='excluded_frozen_input' for x in census),'excluded_non_source_JSON':sum(x['role']=='excluded_non_source_artifact' for x in census)}
index={'schema_version':'1.0','scope':'C-07 offline consolidation; original metadata declarations only','captured_at_utc':START,'counts':summary,'counting_rule':'Group records, document occurrences, URL keys, author reading declarations, root reading observations and bibliography enrichment are separate. None is an all-articles-read or independent-source count.','catalogs':[{'file':rel,'sha256':item['sha256'],'snapshot':item['snapshot'],'collection':'sources' if 'sources' in d else 'groups','groups':len(d.get('sources',d.get('groups',[]))),'original_catalog_metadata':{k:v for k,v in d.items() if k not in ['sources','groups','views','access_failures','excluded_candidates']}} for rel,d,item in catalogs],'source_groups':groups,'document_occurrences':docs,'candidate_records':candidates,'root_only_observation_ids':[r['id'] for r in root_only],'issues':issues}
write('source-index.json',index)
write('reading-observations.json',{'schema_version':1,'author_declarations_reference':'source-index.json#/source_groups','root_observations':reads,'bibliography_enrichments':enrichments,'rules':['Root rereads do not manufacture author full-text reading.','Book metadata completion is not a new observation or independent source.','A source URL with two locators retains two reading/claim scopes.']})
write('identity-opinion-bindings.json',{'schema_version':1,'relationships':identity,'views':views,'rules':['Identity at publication and present employment are different claims.','Joint research/authored article is not each individual separately stating every result.','Official product documentation and personal opinion are distinct.','Resolve short IDs inside their original catalog only.']})
write('url-index.json',{'schema_version':1,'equality':'literal exact URL including fragment; no redirect or canonicalization','entries':[{'url':u,**v} for u,v in sorted(urls.items())],'warning':'A shared URL key is not merged claims or proof of content/version equivalence. Constructed links are explicitly marked and were not network checked.'})
write('scope-and-inputs.json',{'schema_version':1,'scanned_at_utc':START,'files':census,'literal_catalog_URL_occurrences':aux_urls,'exclusions':['All inputs/ copies, including C-05 frozen catalogs.','Audit reports, generated inventories and test/experiment receipts are not new source catalogs.','ROOT_BIBLIOGRAPHY_SUPPLEMENT enriches matching existing observations only.'],'preserved_prior_snapshot':'china/evidence-catalog-audit was not modified.'})
changed=[]
for item in census:
 if item['role'].startswith(('original_','root_')) and sha((ROOT/item['file']).read_bytes())!=item['sha256']:changed.append(item['file'])
write('execution_receipt.json',{'schema_version':1,'captured_at_utc':START,'started_at_utc':RUN_START,'finished_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'input_mode':'frozen_capture' if FROZEN else 'integration_capture','script_sha256':sha(Path(__file__).read_bytes()),'network_requests':0,'original_files_modified':False,'prior_C05_modified':False,'captured_input_files':len(loaded),'inputs_changed_during_capture':changed,'counts':summary})
print(json.dumps(summary,ensure_ascii=False,indent=2))
if changed:raise SystemExit('Input changed during capture: '+str(changed))
