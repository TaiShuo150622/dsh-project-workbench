"""Run the three finite expiry cases; supply an independently trusted TLC jar."""
from pathlib import Path
import argparse
import datetime as dt
import hashlib
import json
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--jar', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path('expiry-results'))
args = parser.parse_args()
root = Path(__file__).resolve().parent
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
jar = args.jar.resolve()
receipts = []
for mode in ('none', 'admission', 'commit'):
    config = f'expiry-{mode}.cfg'
    command = ['java', '-XX:+UseParallelGC', '-cp', str(jar), 'tlc2.TLC',
               '-workers', '1', '-metadir', str(out / f'states-{mode}'),
               '-config', config, 'ExpiryContract.tla']
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    run = subprocess.run(command, cwd=root, text=True, capture_output=True, timeout=50)
    log = run.stdout + run.stderr
    (out / f'{mode}.log').write_text(log)
    expected = 0 if mode == 'commit' else 12
    receipt = {
        'mode': mode, 'start_utc': started,
        'end_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'command': command, 'exit_code': run.returncode, 'expected_exit_code': expected,
        'model_sha256': hashlib.sha256((root / 'ExpiryContract.tla').read_bytes()).hexdigest(),
        'config_sha256': hashlib.sha256((root / config).read_bytes()).hexdigest(),
        'jar_sha256': hashlib.sha256(jar.read_bytes()).hexdigest(),
        'log_sha256': hashlib.sha256(log.encode()).hexdigest(),
        'summary_lines': [line for line in log.splitlines() if any(term in line for term in
            ('Error:', 'states generated', 'Model checking completed', 'depth of the complete', 'Finished in'))],
    }
    receipts.append(receipt)
    print(json.dumps({'mode': mode, 'exit_code': run.returncode, 'summary': receipt['summary_lines']}))
(out / 'receipt.json').write_text(json.dumps(receipts, indent=2) + '\n')
if any(r['exit_code'] != r['expected_exit_code'] for r in receipts):
    raise SystemExit('Unexpected TLC outcome; inspect logs')
