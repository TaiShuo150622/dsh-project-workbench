import { mkdtemp, cp, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const mutations = [
  ['completion-before-acceptance', "if (task.status === 'completed') return { decision: 'skip', reason: 'completed' };", '', 'record completion exits execution before acceptance'],
  ['evidence-scope', "value[key] === expected[key]", 'true', 'record evidence must match repository'],
  ['revision-cas', "command.expectedRevision === task.revision", 'true', 'record failed writes are atomic'],
  ['acceptance-binding', 'canonical(payload.token) === canonical(current)', 'true', 'record old result button cannot accept'],
  ['unknown-occupancy', "['reserved', 'sent', 'unknown'].includes(action.status)", "['reserved', 'sent'].includes(action.status)", 'record unknown sent action cannot be replaced'],
  ['negative-proof', 'payload.proof.senderTerminated === true && payload.proof.notApplied === true', 'payload.proof.notApplied === true', 'record unknown sent action cannot be replaced'],
  ['current-availability', "if (kind === 'current-result') return Boolean(completed && result?.available);", "if (kind === 'current-result') return Boolean(completed);", 'record revert keeps historical completion'],
  ['snapshot-order', 'if (incoming.cursor < current.cursor) return copy(current);', '', 'record stale snapshots cannot replace'],
];
function run(cwd, pattern) {
  return spawnSync(process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=15000', ...(pattern ? ['--test-name-pattern', pattern] : []), 'tests/record-kernel.test.mjs'],
    { cwd, encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
}
const baseline = run(root);
if (baseline.status !== 0 || baseline.error) {
  process.stderr.write(baseline.stdout ?? ''); process.stderr.write(baseline.stderr ?? '');
  throw new Error('Record baseline must pass before mutation testing');
}
const rows = [];
for (const [name, before, after, expected] of mutations) {
  const dir = await mkdtemp(join(tmpdir(), `record-mutant-${name}-`));
  for (const path of ['record', 'tests', 'package.json']) await cp(join(root, path), join(dir, path), { recursive: true });
  const path = join(dir, 'record/kernel.mjs'), original = await readFile(path, 'utf8');
  if (original.split(before).length !== 2) throw new Error(`${name}: expected exactly one mutation site`);
  await writeFile(path, original.replace(before, after));
  const result = run(dir, expected);
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const failures = output.split('\n').filter(line => /^not ok /.test(line));
  const killed = result.status !== null && result.status !== 0 && !result.error && !output.includes('testTimeoutFailure') && failures.some(line => line.includes(expected));
  rows.push({ name, killed, exitCode: result.status, failures });
  console.log(`${killed ? 'KILLED' : 'SURVIVED'} ${name}: ${failures[0] ?? result.error?.message ?? 'no matching behavioral failure'}`);
}
await mkdir(join(root, '.acceptance/evidence'), { recursive: true });
await writeFile(join(root, '.acceptance/evidence/record-mutations.json'), JSON.stringify({ baselinePassed: true, mutations: rows }, null, 2) + '\n');
if (rows.some(row => !row.killed)) process.exitCode = 1;
