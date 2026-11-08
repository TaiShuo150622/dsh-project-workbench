import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url)), dir = join(root, '.acceptance/ci');
await mkdir(dir, { recursive: true });
const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' });
if (git.status !== 0) throw new Error('CI requires a Git commit identity');
const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
if (status.status !== 0) throw new Error('Cannot establish working tree state');
const workingTreeClean = status.stdout.trim() === '';
if (process.env.GITHUB_ACTIONS === 'true' && !workingTreeClean) throw new Error('Remote CI must start from a clean checkout');
const manifest = {
  schemaVersion: 1, repository: process.env.GITHUB_REPOSITORY ?? null,
  commit: git.stdout.trim(), requestedHead: process.env.RECORD_HEAD_SHA ?? git.stdout.trim(),
  runId: process.env.GITHUB_RUN_ID ?? null, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  event: process.env.GITHUB_EVENT_NAME ?? 'local', node: process.version, startedAt: new Date().toISOString(),
  workingTreeClean, status: 'running', steps: [],
};
if (manifest.commit !== manifest.requestedHead) throw new Error('Checked-out commit differs from requested head');
const files = (await readdir(join(root, 'tests'))).filter(name => name.endsWith('.test.mjs')).sort().map(name => `tests/${name}`);
const steps = [
  ['tests', process.execPath, ['--test', '--test-reporter=tap', '--test-timeout=15000', ...files]],
  ['build', process.execPath, ['scripts/build.mjs']],
  ['generated-files', 'git', ['diff', '--exit-code', '--', 'client.js', 'build.json']],
  ['workbench-mutations', process.execPath, ['scripts/mutation-check.mjs']],
  ['record-mutations', process.execPath, ['scripts/record-mutation-check.mjs']],
];
async function save() { await writeFile(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n'); }
await save();
for (const [name, command, args] of steps) {
  // Mutations cannot establish detection quality on a failing baseline.
  if (name.endsWith('mutations') && manifest.steps[0]?.status !== 'passed') {
    manifest.steps.push({ name, status: 'skipped', reason: 'baseline-failed' }); await save(); continue;
  }
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', timeout: 120000, maxBuffer: 16 * 1024 * 1024 });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}\n` : ''}`;
  await writeFile(join(dir, `${name}.log`), output);
  const passed = result.status === 0 && !result.error;
  manifest.steps.push({ name, status: passed ? 'passed' : 'failed', exitCode: result.status, signal: result.signal, log: `${name}.log` });
  console.log(`${name}: ${passed ? 'passed' : 'failed'}`);
  if (!passed) process.stderr.write(output);
  await save();
}
manifest.finishedAt = new Date().toISOString();
manifest.status = manifest.steps.every(step => step.status === 'passed') ? 'passed' : 'failed';
await save();
console.log(`CI ${manifest.status}; evidence: .acceptance/ci/manifest.json`);
if (manifest.status !== 'passed') process.exitCode = 1;
