"""Create a fresh, traceable reading-copy snapshot. Never edits the research source."""
import argparse,datetime,hashlib,html,json,os,re,shutil,subprocess
from pathlib import Path
from urllib.parse import quote,unquote,urlsplit
HERE=Path(__file__).resolve().parent
BASE=HERE.parent;REPO=BASE/'integration';ROOT=REPO/'docs/research/harness-20261107'
OLD='b9d44847d72883bf5116c72f445c31618d7cc020';CODE='7264be10387963f4d575d8688ed8573f4c16c8c4'
GITHUB='https://github.com/TaiShuo150622/dsh-project-workbench/blob/'
RENDER=str(HERE/'render_reading.py')
ap=argparse.ArgumentParser();ap.add_argument('output',type=Path);args=ap.parse_args();OUT=args.output.resolve()
if OUT.exists():raise SystemExit('Use a fresh output directory; existing evidence is not overwritten.')
OUT.mkdir(parents=True);started=datetime.datetime.now(datetime.timezone.utc).isoformat()
def digest(raw):return hashlib.sha256(raw).hexdigest()
def frozen(p):return any(x in p.parts for x in ('inputs','repair-inputs','source-inputs','evidence-inputs','runner-probe','negative-run','negative-rerun','run','rerun','witnesses'))
def excluded(rel):
 if any(x in rel.parts for x in ('__pycache__','.DS_Store')):return 'cache'
 if str(rel).startswith('china/package-boundary-review/'):return 'local package-boundary scan retained outside share copy'
 if rel.suffix=='.html' and not rel.stem.endswith('离线阅读版'):return 'network-dependent or intermediate reading HTML; Markdown retained'
 if rel.name.endswith('.render-receipt.json') and not (ROOT/rel).with_suffix('').with_suffix('.html').exists():return 'orphan render receipt'
 return None
files={};exclusions=[]
for p in sorted(ROOT.rglob('*')):
 if p.is_symlink():raise SystemExit(f'Unexpected symlink {p}')
 if not p.is_file():continue
 rel=p.relative_to(ROOT);reason=excluded(rel)
 if reason:exclusions.append({'path':str(rel),'reason':reason,'original_sha256':digest(p.read_bytes())});continue
 raw=p.read_bytes()
 try:text=raw.decode('utf-8')
 except UnicodeDecodeError:raise SystemExit(f'Unexpected binary {rel}')
 files[str(rel)]={'path':p,'raw':raw,'text':text,'frozen':frozen(rel)}
# Only current non-frozen reader pages get convenient HTML views. Diagrams must
# already have real SVG captures; the renderer's --offline raw Mermaid is not enough.
render_map={};plain=[]
for rel,rec in files.items():
 p=Path(rel)
 if p.suffix!='.md' or rec['frozen']:continue
 target=p.with_name(p.stem+'-离线阅读版.html')
 if str(target) in files:render_map[rel]=str(target)
 elif not re.search(r'^\s*(?:```|~~~)mermaid',rec['text'],re.M):render_map[rel]=str(target);plain.append(rel)
tracked={}
def pinned(target):
 try:rel=target.relative_to(REPO)
 except ValueError:return None
 ref=OLD if str(rel).startswith('docs/harness/') else CODE
 key=(ref,str(rel))
 if key not in tracked:
  tracked[key]=subprocess.run(['git','cat-file','-e',f'{ref}:{rel}'],cwd=REPO,capture_output=True).returncode==0
 return GITHUB+ref+'/'+quote(str(rel),safe='/') if tracked[key] else None
link_records=[]
def map_href(raw,current,html_view=False):
 href=html.unescape(raw);angle=href.startswith('<') and href.endswith('>');href=href[1:-1] if angle else href
 parsed=urlsplit(href)
 if parsed.scheme or href.startswith(('#','//')):return raw
 path=unquote(parsed.path)
 if not path:return raw
 source=ROOT/current
 if path.startswith('/Users/'):
  marker='/docs/research/harness-20261107/'
  if marker in path:target=ROOT/path.split(marker,1)[1]
  else:return raw
 else:target=(source.parent/path).resolve()
 suffix=('?'+parsed.query if parsed.query else '')+('#'+parsed.fragment if parsed.fragment else '')
 try:inside=str(target.relative_to(ROOT))
 except ValueError:inside=None
 result=None;kind=None
 if inside is not None and inside not in files and Path(inside).suffix=='.html':
  candidate=str(Path(inside).with_name(Path(inside).stem+'-离线阅读版.html'))
  if candidate in files:inside=candidate
 if inside is not None and inside in files:
  replacement=render_map.get(inside,inside) if html_view else inside
  result=os.path.relpath(ROOT/replacement,source.parent)+suffix
  kind='reader_html_link' if replacement!=inside else 'portable_internal_link'
 elif inside is None:
  url=pinned(target)
  if url:result=url+suffix;kind='fixed_public_reference'
 if result is None:return raw
 if angle:result='<'+result+'>'
 if result!=raw:link_records.append({'file':str(current),'from':raw,'to':result,'kind':kind})
 return result
records=[]
for rel,rec in files.items():
 p=Path(rel);s=rec['text'];rules=[]
 # Frozen snapshots preserve their historical link syntax; path redaction is still
 # explicit in the derived-byte mapping. Current reading navigation is separate.
 if not rec['frozen']:
  before=s
  if p.suffix=='.md':s=re.sub(r'(\]\()([^\n)]*)(\))',lambda m:m[1]+map_href(m[2],p)+m[3],s)
  elif p.suffix=='.html':s=re.sub(r'(href=")([^"]*)(")',lambda m:m[1]+html.escape(map_href(m[2],p,True),quote=True)+m[3],s)
  if s!=before:rules.append('current_reader_links_to_relative_or_fixed_public_commit')
 before=s;s=s.replace('__LOCAL_HOME__','__LOCAL_HOME__');s=re.sub(r'/private/var/folders/[^/\s"<>]+/[^/\s"<>]+/T/', '__LOCAL_TMP__/',s)
 if s!=before:rules.append('personal_environment_path_redaction')
 raw=s.encode();dest=OUT/p;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(raw)
 records.append({'path':rel,'original_sha256':digest(rec['raw']),'derived_sha256':digest(raw),'original_bytes':len(rec['raw']),'derived_bytes':len(raw),'transformations':rules,'role':'frozen_evidence_derivative' if rec['frozen'] and rules else 'frozen_evidence' if rec['frozen'] else 'reading_or_evidence_file'})
# Render textual reader pages from their derived Markdown. Rewrite view links to
# other generated reader pages, retaining the source Markdown beside each view.
generated=[]
for rel in plain:
 md=OUT/rel;target=OUT/render_map[rel]
 subprocess.run(['python3',RENDER,str(md),str(target),'--offline'],check=True,capture_output=True,text=True)
 text=target.read_text();text=text.replace('</head>','<link rel="icon" href="data:,">\n</head>',1)
 # Target/source parents are the same, so resolve href in the original layout.
 text=re.sub(r'(href=")([^"]*)(")',lambda m:m[1]+html.escape(map_href(m[2],Path(render_map[rel]),True),quote=True)+m[3],text)
 target.write_text(text)
 build_receipt=target.with_suffix('.reading-build.json')
 build_data=json.loads(build_receipt.read_text())
 build_data['renderer_output_sha256_before_package_transform']=build_data['output_sha256']
 build_data['output_sha256']=digest(target.read_bytes())
 build_data['post_render_transforms']=['data favicon','internal reader links resolved to available HTML views']
 build_data['output_sha256_role']='final packaged HTML bytes'
 build_receipt.write_text(json.dumps(build_data,ensure_ascii=False,indent=2)+'\n')
 generated.append({'path':render_map[rel],'from_markdown':rel,'markdown_sha256':digest(md.read_bytes()),'sha256':digest(target.read_bytes()),'external_diagram_dependency':False})
notes='''# 阅读副本与证据身份\n\n本目录是本地整理的派生阅读包，尚未公开发布。当前来源目录及固定源码的历史身份仍以各自回执和 SHA 为准；根目录 PACKAGE_MANIFEST.json 标识本包实际字节。\n\n- 个人主目录和随机临时目录被替换为 __LOCAL_HOME__ / __LOCAL_TMP__。这类回执是路径脱敏副本，不是原始执行输出；原件保留在本地研究集。\n- 当前阅读页中出包的旧公开稿及产品文件链接，转为实际存在的固定 Git 提交链接。打开这些外部参考需要网络；本包页面与内嵌图表本身不依赖它们加载。\n- 冻结 inputs 的旧相对链接保持历史形式，有些只在原位置成立。阅读请从 README 的当前入口进入；不要把冻结快照当导航页。\n- 相邻 *.render-receipt.json 是导出前的渲染阶段回执，output_sha256 指当时原视图；PACKAGE_VIEW_IDENTITIES.json 连接它与包中最终视图。新生成的 *.reading-build.json 分别记录渲染前后处理的两个输出身份。\n- 历史 SHA256SUMS 和 *_PASS_MANIFEST.json 描述各次输入或接收时的字节。它们不承诺与脱敏/链接转换后的本包逐字节相同；DERIVATION.json 给出原始与派生哈希对应。\n- 在线 Mermaid HTML、构建中间页、工具链二进制、浏览器缓存和本机边界扫描目录不进入此包。模型、配置、错误轨迹和负对照不会因结果失败被删除。\n- DSH 固定源码片段/文件作为复核输入保留，附 third-party-notices/deepseek-harness/LICENSE。该许可针对相应第三方源码；本包没有替资料所有者授予全部研究文档新的开源许可。\n\n复跑先读 REPRODUCE.md。真实产品、认证入口、外部效果、迁移和任务收益仍按 EVIDENCE.md 的状态理解。\n'''
view_identities=[]
for rel,rec in files.items():
 if rel.endswith('.render-receipt.json'):
  receipt=json.loads(rec['text']);html_path=str(Path(rel).with_suffix('').with_suffix('.html'))
  if (OUT/html_path).is_file():view_identities.append({'render_receipt':rel,'role':'historical_pre_export_render_stage','pre_export_output_sha256':receipt.get('output_sha256'),'packaged_html':html_path,'packaged_html_sha256':digest((OUT/html_path).read_bytes())})
(OUT/'PACKAGE_VIEW_IDENTITIES.json').write_text(json.dumps({'scope':'render stage and packaged view are different byte identities','views':view_identities},ensure_ascii=False,indent=2)+'\n')
(OUT/'PACKAGE_NOTES.md').write_text(notes)
(OUT/'DERIVATION.json').write_text(json.dumps({'created_at_utc':started,'scope':'derived reading copy, no publication','files':records,'generated_views':generated,'link_transformations':link_records,'excluded':exclusions},ensure_ascii=False,indent=2)+'\n')
# Check source consistency after copying; source mutation does not silently become
# a purported single snapshot. Partial output stays available for diagnosis.
changed=[rel for rel,rec in files.items() if rec['path'].read_bytes()!=rec['raw']]
if changed:raise SystemExit('Source changed during export: '+json.dumps(changed,ensure_ascii=False))
manifest=[]
for p in sorted(OUT.rglob('*')):
 if p.is_file():manifest.append({'path':str(p.relative_to(OUT)),'bytes':p.stat().st_size,'sha256':digest(p.read_bytes())})
(OUT/'PACKAGE_MANIFEST.json').write_text(json.dumps({'created_at_utc':started,'completed_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'DRAFT_EXPORT_PENDING_VALIDATION','source_code_commit':CODE,'source_archive_commit':OLD,'files':manifest},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'output':str(OUT),'copied_files':len(records),'generated_views':len(generated),'excluded':len(exclusions),'rewritten_links':len(link_records),'bytes':sum(x['bytes'] for x in manifest)},ensure_ascii=False))
