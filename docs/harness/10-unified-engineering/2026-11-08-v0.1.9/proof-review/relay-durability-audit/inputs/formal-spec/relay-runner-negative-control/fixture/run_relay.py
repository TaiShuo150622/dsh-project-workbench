"""Run the three finite relay durability cases; supply an independently trusted TLC jar."""
from pathlib import Path
import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('--jar', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path('relay-results'))
args = parser.parse_args()
root = Path(__file__).resolve().parent
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
jar = args.jar.resolve()
receipts = []
for mode in ('memory', 'durable', 'error'):
    config = f'relay-{mode}.cfg'
    command = ['java', '-XX:+UseParallelGC', '-cp', str(jar), 'tlc2.TLC',
               '-workers', '1', '-metadir', str(out / f'states-{mode}'),
               '-config', config, 'DurableRelay.tla']
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    run = subprocess.run(command, cwd=root, text=True, capture_output=True, timeout=50)
    log = run.stdout + run.stderr
    (out / f'{mode}.log').write_text(log)
    expected = 0 if mode == 'durable' else 12
    violations = re.findall(r'Error: Invariant ([A-Za-z_][A-Za-z_0-9]*) is violated\.', log)
    counts = re.findall(r'([\d,]+) states generated, ([\d,]+) distinct states found, ([\d,]+) states left on queue\.', log)
    state_counts = [int(v.replace(',', '')) for v in counts[-1]] if counts else None
    errors = [line for line in log.splitlines() if line.startswith('Error:')]
    expected_invariant = 'NoLostSent' if mode == 'memory' else 'ErrorProvesAbsence'
    expected_errors = [f'Error: Invariant {expected_invariant} is violated.',
                       'Error: The behavior up to this point is:']
    if mode == 'durable':
        outcome_matches = (run.returncode == 0 and not errors and not violations
                           and 'Model checking completed. No error has been found.' in log
                           and state_counts is not None and state_counts[2] == 0)
    else:
        outcome_matches = (run.returncode == 12 and violations == [expected_invariant]
                           and errors == expected_errors and state_counts is not None)
    receipt = {
        'mode': mode, 'start_utc': started,
        'end_utc': dt.datetime.now(dt.timezone.utc).isoformat(),
        'command': command, 'exit_code': run.returncode, 'expected_exit_code': expected,
        'observed_violations': violations, 'state_counts': state_counts,
        'outcome_matches': outcome_matches,
        'model_sha256': hashlib.sha256((root / 'DurableRelay.tla').read_bytes()).hexdigest(),
        'config_sha256': hashlib.sha256((root / config).read_bytes()).hexdigest(),
        'jar_sha256': hashlib.sha256(jar.read_bytes()).hexdigest(),
        'log_sha256': hashlib.sha256(log.encode()).hexdigest(),
        'summary_lines': [line for line in log.splitlines() if any(term in line for term in
            ('Error:', 'states generated', 'Model checking completed', 'depth of the complete', 'Finished in'))],
    }
    receipts.append(receipt)
    print(json.dumps({'mode': mode, 'exit_code': run.returncode, 'summary': receipt['summary_lines']}))
(out / 'receipt.json').write_text(json.dumps(receipts, indent=2) + '\n')
if any(not r['outcome_matches'] for r in receipts):
    raise SystemExit('Unexpected TLC outcome; inspect logs')
