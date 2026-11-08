"""C-05: metadata audit only. Read integration JSON, write this audit directory only.
No network requests. Never promotes catalog declarations to newly verified source readings.
"""
from pathlib import Path
from collections import Counter,defaultdict
from urllib.parse import urldefrag,urlsplit
import json,hashlib,re,datetime,sys
OUT=Path(__file__).resolve().parent
DEFAULT=OUT.parents[5]/'integration/docs/research/harness-20261107'
# Explicit source root avoids silently treating our own output as an original catalog.
ROOT=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else DEFAULT
if not (ROOT/'china/sources.json').is_file(): raise SystemExit('Pass integration/docs/research/harness-20261107 as argument')
START=datetime.datetime.now(datetime.timezone.utc).isoformat()
sha=lambda b:hashlib.sha256(b).hexdigest()
write=lambda name,obj:(OUT/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def ptr_escape(s):return str(s).replace('~','~0').replace('/','~1')
def walk_url(obj,pointer=''):
 if isinstance(obj,dict):
  for k,v in obj.items():yield from walk_url(v,pointer+'/'+ptr_escape(k))
 elif isinstance(obj,list):
  for i,v in enumerate(obj):yield from walk_url(v,pointer+'/'+str(i))
 elif isinstance(obj,str) and re.match(r'^https?://\S+$',obj):yield pointer,obj

def selected(obj,keys):return {k:obj[k] for k in keys if k in obj}
def first(obj,keys):
 for k in keys:
  if k in obj and obj[k] is not None and obj[k]!=[] and obj[k]!='':return {'field':k,'value':obj[k]}
 return None
ATTR=['organization_or_author','author_organization','author_or_institution','authors_or_organization','authors','organization','publisher','company']
PUB=['published_at','publication_date','published_date','published']
ACCESS=['accessed_at','accessed_date','accessed_at_utc']
READ=['retrieval_status','evidence_status','body_status','read_status','verification','validation','read_scope','read','reading_coverage','read_by','not_read']
LOC=['anchors','line_ranges','locators','locator','location','lines','read_scope','read','reading_coverage']
VERS=['repository','repo','commit','baseline_commit','snapshot_commit_at','commit_date','path','file','version','version_date','specification_version','content_as_of','revision_date','last_substantive_update','pdf_sha256','raw_file_sha256','date']
CLAIMS=['supported_claims','claims','supports','claim']
LIMIT=['limitations','limits','limit','date_note','date_kind','date_basis','publication_date_basis']
NATURE=['category','kind','evidence_type','type','view_category']
CATREAD=['method','evidence_status','evidence_policy','status','coverage_note','limits','source_policy']
all_files=[]; catalogs=[]; reviews=[]; snapshots=[]
for p in sorted(ROOT.rglob('*.json')):
 raw=p.read_bytes();rel=str(p.relative_to(ROOT))
 try:d=json.loads(raw)
 except Exception as e:
  all_files.append({'path':rel,'sha256':sha(raw),'classification':'INVALID_JSON','error':str(e)});continue
 is_input_snapshot='inputs' in p.relative_to(ROOT).parts
 is_catalog=not is_input_snapshot and p.name=='sources.json' and isinstance(d,dict) and isinstance(d.get('sources'),list)
 is_review=not is_input_snapshot and p.name.startswith('ROOT_SOURCE_REVIEW') and isinstance(d,dict) and isinstance(d.get('entries'),list)
 classification='PRIMARY_SOURCE_CATALOG' if is_catalog else 'ROOT_CROSS_REVIEW' if is_review else 'EXCLUDED_NON_SOURCE_CATALOG'
 reason='Contains explicit sources[] evidence entries.' if is_catalog else 'Additional root reading receipts; kept separate from original source entries.' if is_review else 'Frozen inputs/ copy; never count as a new original source catalog.' if is_input_snapshot else 'No source-catalog sources[] or root-review entries[] contract; artifact/experiment/input/baseline metadata, not a bibliography.'
 urls=list(walk_url(d))
 row={'path':rel,'sha256':sha(raw),'bytes':len(raw),'classification':classification,'reason':reason,'top_level_keys':list(d) if isinstance(d,dict) else None,'exact_url_string_occurrences':len(urls)}
 if urls and not (is_catalog or is_review):row['excluded_url_examples']=[{'pointer':a,'url':b} for a,b in urls[:5]]
 all_files.append(row)
 if is_catalog or is_review:
  dest=OUT/'inputs'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
  row['snapshot']='inputs/'+rel;snapshots.append((rel,row['sha256']))
  (catalogs if is_catalog else reviews).append((rel,d,row))
entries=[]; documents=[]; extras=[]; url_occurrences=[]; identity=[]; view_groups=[]; issues=[]
def make_entry(rel,d,row,index,raw):
 pointer='/sources/'+str(index);uid=rel+'#'+pointer
 publication=first(raw,PUB);access=first(raw,ACCESS);catalog_access=first(d,ACCESS+['as_of','created_at','generated_at_utc'])
 if not publication and isinstance(raw.get('date'),dict) and 'submission' in raw['date'].get('kind',''):
  publication={'field':'date','value':raw['date'],'interpretation':'Explicit submission date; not an inferred journal publication date.'}
 # A generated/as_of date is inventory timing, not silently substituted for per-source access.
 access_inheritance=catalog_access if catalog_access and catalog_access['field'].startswith('accessed') else None
 read=selected(raw,READ)
 inaccessible=any('inaccessible' in str(v).lower() or '403' in str(v) or 'body access failed' in str(v).lower() for v in read.values())
 if inaccessible:reading='DECLARED_BODY_NOT_READ_OR_INACCESSIBLE'
 elif read:reading='ENTRY_READING_DECLARATION_PRESENT'
 else:reading='NO_ENTRY_READING_STATUS; SEE_CATALOG_SCOPE_ONLY'
 fields={'title':raw.get('title'),'url':raw.get('url'),'attribution':first(raw,ATTR),'publication':publication,
 'publication_raw_fields':selected(raw,PUB),'access':access or access_inheritance,'access_inherited_from_catalog':not bool(access) and bool(access_inheritance),
 'source_date_semantics':{'explicit_kind':raw.get('date_kind') or (raw.get('date',{}).get('kind') if isinstance(raw.get('date'),dict) else None),'notes':selected(raw,['date_note','date_basis','publication_date_basis']),'warning':'publication retains source field naming; consult explicit kind/notes. Last-updated, event, commit and access dates are not interchangeable.'},
 'catalog_temporal_context':selected(d,ACCESS+['as_of','created_at','generated_at_utc']),
 'evidence_nature':first(raw,NATURE),'author_reading_status':reading,'author_reading_declarations':read,
 'catalog_reading_declarations':selected(d,CATREAD),'claims':selected(raw,CLAIMS),'limitations':selected(raw,LIMIT),
 'locators':selected(raw,LOC),'version_and_source_binding':selected(raw,VERS)}
 claim_locators=[c['locator'] for c in raw.get('claims',[]) if isinstance(c,dict) and 'locator' in c]
 if claim_locators:fields['locators']['claim_locators']=claim_locators
 if 'pdf_pages' in raw:fields['document_extent']={'pdf_pages':raw['pdf_pages'],'not_reading_coverage':True}
 if 'code' in raw:fields['code_binding']=raw['code']
 missing=[key for key,val in [('title',fields['title']),('url',fields['url']),('attribution',fields['attribution']),('publication_date',publication),('access_date',fields['access']),('evidence_nature',fields['evidence_nature']),('entry_reading_status',read),('locator',fields['locators'])] if not val]
 item={'occurrence_id':uid,'original_file':rel,'original_file_sha256':row['sha256'],'json_pointer':pointer,'original_id':raw.get('id'),**fields,'missing_or_unspecified_normalized_fields':missing,'raw_entry':raw}
 item['adoption_status']='UNADOPTED_CANDIDATE_RETAINED_IN_SOURCES' if inaccessible and not any(fields['claims'].values()) else 'CATALOG_CLAIM_OR_ATTRIBUTION_ENTRY'
 entries.append(item)
 if raw.get('url'):documents.append({'occurrence_id':uid,'parent_occurrence_id':uid,'document_role':'main_source_url','url':raw['url'],'locators':fields['locators'],'version_and_source_binding':fields['version_and_source_binding'],'original_id':raw.get('id'),'original_file':rel})
 for j,doc in enumerate(raw.get('primary_documents',[])):
  docuid=uid+'/primary_documents/'+str(j)
  documents.append({'occurrence_id':docuid,'parent_occurrence_id':uid,'document_role':'explicit_nested_primary_document','url':doc.get('url'),'title':doc.get('title'),'locators':selected(doc,LOC),'version_and_source_binding':{**selected(raw,VERS),**selected(doc,VERS)},'original_id':raw.get('id'),'original_file':rel,'raw_document':doc,'attribution_and_reading_inherited_from_parent':True})
 if isinstance(raw.get('paired_file'),dict) and raw['paired_file'].get('url'):
  doc=raw['paired_file']
  documents.append({'occurrence_id':uid+'/paired_file','parent_occurrence_id':uid,'document_role':'explicit_paired_primary_document','url':doc['url'],'title':doc.get('title'),'locators':{'parent_paired_reading_coverage':raw.get('reading_coverage')},'version_and_source_binding':{**selected(raw,VERS),**selected(doc,VERS)},'original_id':raw.get('id'),'original_file':rel,'raw_document':doc,'attribution_and_reading_inherited_from_parent':True})
 return item
for rel,d,row in catalogs:
 for i,raw in enumerate(d['sources']):
  if not isinstance(raw,dict):issues.append({'kind':'NON_OBJECT_SOURCE_ENTRY','file':rel,'index':i});continue
  entry=make_entry(rel,d,row,i,raw)
 for section in ('access_failures','excluded_candidates'):
  for i,raw in enumerate(d.get(section,[])):
   extras.append({'occurrence_id':rel+'#/'+section+'/'+str(i),'original_file':rel,'json_pointer':'/'+section+'/'+str(i),'entry_role':section,'raw_entry':raw,'counted_as_adopted_source':False})
 for pointer,url in walk_url(d):
  if pointer.startswith('/sources/'):
   parent=rel+'#'+'/'.join(pointer.split('/')[:3]);tail='/'.join(pointer.split('/')[3:])
   role='main_source_url' if tail=='url' else 'nested_primary_document_url' if '/primary_documents/' in pointer else 'paired_primary_document_url' if tail=='paired_file/url' else 'fixed_source_permalink' if tail.endswith('permalink') else 'identity_reference_url' if '/identity_' in pointer or '/affiliation_' in pointer else 'alternate_full_text_url' if tail in ('pdf_url','full_text_url') else 'auxiliary_source_field_url'
  else:parent=None;role='excluded_or_failed_candidate_url' if pointer.startswith(('/access_failures/','/excluded_candidates/')) else 'catalog_auxiliary_url'
  url_occurrences.append({'catalog':rel,'json_pointer':pointer,'url':url,'parent_occurrence_id':parent,'url_role':role})
 by_id={x.get('id'):rel+'#/sources/'+str(i) for i,x in enumerate(d['sources']) if isinstance(x,dict)}
 for i,raw in enumerate(d['sources']):
  uid=rel+'#/sources/'+str(i)
  for field in ('affiliation_sources','identity_sources'):
   for ref in raw.get(field,[]):
    identity.append({'opinion_or_attribution_source':uid,'relationship_field':field,'identity_reference':ref,'resolved_identity_occurrence':by_id.get(ref),'resolution_rule':'same catalog ID only','self_reference':by_id.get(ref)==uid,'not_current_employment_proof':True})
    if ref not in by_id:issues.append({'kind':'UNRESOLVED_LOCAL_IDENTITY_REFERENCE','source':uid,'reference':ref})
  if raw.get('identity_basis'):
   identity.append({'opinion_or_attribution_source':uid,'relationship_field':'identity_basis','inline_identity_evidence':raw['identity_basis'],'not_current_employment_proof':True})
  if raw.get('affiliations_from_pdf_title_page'):
   identity.append({'opinion_or_attribution_source':uid,'relationship_field':'affiliations_from_pdf_title_page','author_affiliations':raw['affiliations_from_pdf_title_page'],'scope':'paper title page at the identified version; joint paper is not each author individual statement','not_current_employment_proof':True})
 for i,v in enumerate(d.get('views',[])):
  view_groups.append({'view_occurrence_id':rel+'#/views/'+str(i),'original_file':rel,'raw_view':v,'resolved_source_occurrences':[by_id.get(x) for x in v.get('source_ids',[])],'identity_edges_separate':True})
review_entries=[]
def arxiv_identity(url):
 m=re.match(r'^https?://arxiv\.org/(?:abs|html|pdf)/(\d+\.\d+)(v\d+)?(?:\.pdf)?$',urldefrag(url or '')[0])
 return (m[1],m[2] or 'UNVERSIONED') if m else None
for rel,d,row in reviews:
 for i,r in enumerate(d['entries']):
  url=r.get('url');matches=[]
  for doc in documents:
   if doc.get('url')==url:matches.append({'source_document':doc['occurrence_id'],'match':'EXACT_URL'})
   elif doc.get('url') and url and urldefrag(doc['url'])[0]==urldefrag(url)[0]:matches.append({'source_document':doc['occurrence_id'],'match':'SAME_URL_WITHOUT_FRAGMENT; LOCATOR_SCOPE_NOT_MERGED'})
  for occurrence in url_occurrences:
   if occurrence['url_role'] not in ('fixed_source_permalink','alternate_full_text_url'):continue
   if occurrence['url']==url:
    matches.append({'source_document':occurrence['catalog']+'#'+occurrence['json_pointer'],'parent_occurrence_id':occurrence['parent_occurrence_id'],'match':'EXACT_ALTERNATE_URL','url_role':occurrence['url_role']})
   elif url and urldefrag(occurrence['url'])[0]==urldefrag(url)[0]:
    matches.append({'source_document':occurrence['catalog']+'#'+occurrence['json_pointer'],'parent_occurrence_id':occurrence['parent_occurrence_id'],'match':'ALTERNATE_URL_WITHOUT_FRAGMENT; LOCATOR_SCOPE_NOT_MERGED','url_role':occurrence['url_role']})
  related=[]
  if arxiv_identity(url):
   for doc in documents:
    other=arxiv_identity(doc.get('url'))
    if other and other[0]==arxiv_identity(url)[0] and doc.get('url')!=url:
     related.append({'source_document':doc['occurrence_id'],'relation':'SAME_ARXIV_WORK_VERSION_DIFFERENT_REPRESENTATION' if other==arxiv_identity(url) else 'SAME_ARXIV_WORK_DIFFERENT_OR_UNPINNED_VERSION','content_equivalence_not_checked':True})
  review_entries.append({'review_occurrence_id':rel+'#/entries/'+str(i),'original_file':rel,'original_file_sha256':row['sha256'],'original_id':r.get('id'),'url':url,'reviewer_role':'ROOT_ADDITIONAL_CROSS_REVIEW','access':first(r,ACCESS) or first(d,ACCESS),'source_matches':matches,'related_work_candidates':related,'raw_review':r,'does_not_change_original_author_reading_status':True})
  if not matches:issues.append({'kind':'ROOT_REVIEW_WITHOUT_CATALOG_URL_MATCH','review':review_entries[-1]['review_occurrence_id'],'url':url,'related_work_candidates':related,'classification':'different representation of known work' if related else 'root-only source observation; author catalog not invented'})

def groups(items,key):
 g=defaultdict(list)
 for i in items:
  if i.get(key):g[i[key]].append(i)
 return g
primary_url_groups=groups(documents,'url');entry_url_groups=groups(entries,'url')
exact_groups=[]
for url,items in sorted(primary_url_groups.items()):
 if len(items)>1:
  scopes={json.dumps({'locators':x.get('locators'),'version':x.get('version_and_source_binding')},sort_keys=True,ensure_ascii=False) for x in items}
  exact_groups.append({'url':url,'occurrences':[x['occurrence_id'] for x in items],'count':len(items),'distinct_binding_or_locator_shapes':len(scopes),'merge_policy':'May share a URL index key; preserve every assertion, locator, version, read declaration and reviewer separately.'})
fragment_families=defaultdict(list);version_families=defaultdict(list)
for doc in documents:
 url=doc.get('url')
 if not url:continue
 base,frag=urldefrag(url);fragment_families[base].append(doc)
 gh=re.match(r'^https://github\.com/([^/]+/[^/]+)/blob/([^/]+)/(.+)$',base)
 ar=re.match(r'^https?://arxiv\.org/(abs|html|pdf)/(\d+\.\d+)(v\d+)?(?:\.pdf)?$',base)
 if gh:version_families['github:'+gh[1]+':'+gh[3]].append((doc,gh[2],base))
 elif ar:version_families['arxiv:'+ar[2]].append((doc,ar[3] or 'UNVERSIONED',base))
nonmerge=[]
for base,items in fragment_families.items():
 if len({x['url'] for x in items})>1:
  nonmerge.append({'family':base,'reason':'URL fragments differ; may index one document, but read scopes and claim anchors remain distinct.','members':[{'occurrence_id':x['occurrence_id'],'url':x['url'],'locators':x['locators']} for x in items]})
for key,items in version_families.items():
 versions={v for _,v,_ in items};urls={url for _,_,url in items}
 if len(versions)>1 or (key.startswith('arxiv:') and len(urls)>1):
  nonmerge.append({'family':key,'reason':'Different or unpinned versions/representations. No content equivalence inferred; do not collapse reads or claims.','versions':sorted(versions),'members':[{'occurrence_id':x['occurrence_id'],'url':x['url'],'version':v,'locators':x['locators']} for x,v,_ in items]})
ids=defaultdict(list)
for e in entries:
 if e['original_id']:ids[e['original_id']].append(e['occurrence_id'])
colliding_ids={k:v for k,v in ids.items() if len(v)>1}
for k,v in colliding_ids.items():issues.append({'kind':'ID_REUSED_ACROSS_CATALOGS','id':k,'occurrences':v,'action':'Use catalog-qualified occurrence identity; do not resolve references globally by short ID.'})
missing_counts=Counter(x for e in entries for x in e['missing_or_unspecified_normalized_fields'])
for field,count in missing_counts.items():
 issues.append({'kind':'MISSING_OR_UNSPECIFIED_NORMALIZED_FIELD','field':field,'count':count,'occurrences':[e['occurrence_id'] for e in entries if field in e['missing_or_unspecified_normalized_fields']],'interpretation':'Missing is not unread/invalid. Publication null is often intentional for dynamic docs or pinned source; entry reading status may exist only at catalog scope.'})
# Explicit candidates lacking body access are not promoted by nearby successful replacements.
not_read=[{'occurrence_id':e['occurrence_id'],'url':e['url'],'author_reading_declarations':e['author_reading_declarations'],'limitations':e['limitations']} for e in entries if e['author_reading_status']=='DECLARED_BODY_NOT_READ_OR_INACCESSIBLE']
for e in extras:
 raw=e['raw_entry'];text=json.dumps(raw,ensure_ascii=False).lower()
 if any(x in text for x in ('403','search-discovered','inaccessible','fetch failed','未读','无法读取')):
  not_read.append({'occurrence_id':e['occurrence_id'],'url':raw.get('url'),'raw_status':raw,'counted_as_adopted_source':False})
summary={'json_files_scanned':len(all_files),'primary_catalog_files':len(catalogs),'root_cross_review_files':len(reviews),'excluded_other_json_files':sum(x['classification']=='EXCLUDED_NON_SOURCE_CATALOG' for x in all_files),'source_entry_count':len(entries),'explicit_nested_primary_documents':sum(x['document_role']=='explicit_nested_primary_document' for x in documents),'explicit_paired_primary_documents':sum(x['document_role']=='explicit_paired_primary_document' for x in documents),'primary_document_url_occurrences':len(documents),'source_entry_exact_url_unique':len(entry_url_groups),'source_entry_duplicate_url_excess':len(entries)-len(entry_url_groups),'primary_document_exact_url_unique':len(primary_url_groups),'primary_document_duplicate_url_excess':len(documents)-len(primary_url_groups),'primary_document_duplicate_url_groups':len(exact_groups),'all_catalog_url_string_occurrences':len(url_occurrences),'all_catalog_exact_url_string_unique':len({x['url'] for x in url_occurrences}),'root_review_entries':len(review_entries),'root_review_exact_url_unique':len({x['url'] for x in review_entries if x['url']}),'root_only_url_candidates':len({x['url'] for x in review_entries if not x['source_matches']}),'combined_primary_document_and_root_review_exact_url_unique':len(set(primary_url_groups)|{x['url'] for x in review_entries if x['url']}),'excluded_or_failed_candidate_entries':len(extras),'explicit_body_unread_or_inaccessible_records':len(not_read),'short_id_collision_groups':len(colliding_ids),'identity_binding_edges':len(identity),'explicit_person_view_groups':len(view_groups),'missing_or_unspecified_fields':dict(missing_counts)}
root_only=[r for r in review_entries if not r['source_matches'] and not r['related_work_candidates']]
summary['root_only_sources_without_catalog_or_same_work_match']=len({r['url'] for r in root_only})
summary['unadopted_candidates_inside_sources_array']=sum(e['adoption_status']=='UNADOPTED_CANDIDATE_RETAINED_IN_SOURCES' for e in entries)
summary['per_catalog_source_entries']={rel:len(d['sources']) for rel,d,row in catalogs}
for r in root_only:
 issues.append({'kind':'ROOT_ONLY_SOURCE_METADATA_INCOMPLETE','review':r['review_occurrence_id'],'url':r['url'],'missing_fields':[k for k in ['title','authors','publication_date','evidence_kind'] if k not in r['raw_review']],'note':'Read status and locator are explicit; bibliographic fields should be supplied by root without inventing an original-author catalog entry.'})
write('catalog-inventory.json',{'schema_version':1,'started_at_utc':START,'source_root':'integration/docs/research/harness-20261107','classification_rules':['Include sources.json with sources[] as original primary catalogs, regardless of entry-level unread status. Exclude every inputs/ snapshot copy.','Keep ROOT_SOURCE_REVIEW*.json entries as separate reviewer observations; never overwrite author reading status.','Inventory all other JSON but exclude artifact hashes, test results, specifications and repository baseline metadata from bibliographic counts.','Expand explicit primary_documents[] and paired_file as additional primary document occurrences. Keep PDF/permalink/identity/auxiliary URLs in a separate occurrence index.','Exclude access_failures/excluded_candidates from adopted source entry count; retain them as discovery/access audit.','Exact URL equality uses the literal stored URL, including fragments; no redirects, case folding, query stripping, version guessing or network fetch.'], 'summary':summary,'files':all_files})
write('source-inventory.json',{'schema_version':1,'audit_mode':'OFFLINE_METADATA_ONLY; not a new source-body review','source_entries':entries,'primary_document_occurrences':documents,'all_catalog_url_occurrences':url_occurrences,'excluded_or_failed_candidates':extras,'root_only_source_observations':root_only})
write('dedup-plan.json',{'schema_version':1,'summary':summary,'exact_url_duplicate_groups':exact_groups,'related_but_not_mergeable_groups':nonmerge,'short_id_collisions':colliding_ids,'recommended_entities':['SourceDocument indexed by exact URL plus pinned version/content identity where available.','SourceAssertion retains original catalog hash, JSON pointer, ID, claim, locator and limits.','ReadingObservation records author declaration and root cross-review separately, with scope and date.','IdentityEvidence links a dated affiliation claim to original evidence; OpinionEvidence links the person and claimed view without company-promise promotion.'],'never_merge_rules':['Same URL does not establish identical reading scope, claim, body version or independent corroboration.','Different commit, arXiv version, unversioned URL or representation stays separate until content equivalence is established.','Locators may share one document index but remain separate evidence assertions.','Do not count a root reread as a second independent source or promote a catalog-wide method into item-level full-text audit.']})
write('root-cross-review-index.json',{'schema_version':1,'reviews':review_entries,'note':'Matching is a routing aid only. Exact URL or fragment-only matches do not combine scopes or manufacture independent corroboration.'})
write('identity-opinion-bindings.json',{'schema_version':1,'bindings':identity,'view_groups':view_groups,'rules':['Resolve bare source IDs only within their original catalog.','A source can supply both identity and opinion evidence, but roles and claims remain separate.','Historical official bylines/paper affiliations do not prove current employment.','Joint paper authorship is not an individually attributed employee statement.','An issue collaborator label does not by itself prove employment.','A personal essay with unconfirmed affiliation at publication stays personal; old affiliation does not fix it.']})
write('field-issues.json',{'schema_version':1,'issues':issues,'explicit_not_read_or_inaccessible':not_read,'reading_status_counts':dict(Counter(e['author_reading_status'] for e in entries)),'evidence_nature_counts':dict(Counter(str(e['evidence_nature']['value']) if e['evidence_nature'] else 'MISSING' for e in entries))})
changed=[rel for rel,digest in snapshots if sha((ROOT/rel).read_bytes())!=digest]
write('execution_receipt.json',{'schema_version':1,'started_at_utc':START,'finished_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':['python3','audit_sources.py','<integration>/docs/research/harness-20261107'],'network_requests':0,'source_json_modified':False,'captured_catalog_or_review_files':len(snapshots),'source_files_changed_during_audit':changed,'script_sha256':sha(Path(__file__).read_bytes()),'summary':summary,'source_root_absolute_not_stored':True})
print(json.dumps(summary,ensure_ascii=False,indent=2))
if changed:raise SystemExit('Source changed during capture: '+str(changed))
