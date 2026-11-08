"""Run only the copied portable validator; reject workspace reads outside copy."""
from pathlib import Path
import runpy,sys,json
package=Path(sys.argv[1]).resolve()
audit_output=Path(sys.argv[2]).resolve()
workspace=Path('__LOCAL_HOME__/Documents/Codex').resolve()
events=[];enabled=True
def audit(event,args):
    if not enabled or event!='open' or not isinstance(args[0],(str,bytes)):return
    p=Path(args[0]).resolve()
    if p.is_relative_to(workspace):
        allowed=p.is_relative_to(package)
        events.append({'path':str(p),'mode':str(args[1]),'inside_copied_package':allowed})
        if not allowed:raise PermissionError('validator attempted external workspace access: '+str(p))
sys.addaudithook(audit)
exit_code=0
try:
    runpy.run_path(str(package/'china/consolidated-sources/validate_index_portable.py'),run_name='__main__')
except SystemExit as exc:
    exit_code=exc.code or 0
finally:
    enabled=False
    audit_output.write_text(json.dumps({'package':str(package),'checked_open_events':events,'all_workspace_opens_inside_copy':all(x['inside_copied_package'] for x in events),'exit_code':exit_code},ensure_ascii=False,indent=2)+'\n')
raise SystemExit(exit_code)
