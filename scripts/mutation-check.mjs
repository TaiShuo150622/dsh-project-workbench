// Deliberately break each boundary in a disposable copy. The working checkout is never patched.
import { mkdtemp, cp, symlink, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile), root = fileURLToPath(new URL('../', import.meta.url));
const mutations = [
  ['role-boundary', 'server/projects.js', "if (role !== 'lead') throw Error('只有项目总对话可以分派线程');", "if (role !== 'lead') actor = p.lead;", 'worker cannot dispatch'],
  ['dispatch-dedup', 'server/projects.js', 'if (duplicate) return duplicate;', '', 'stable dispatch key'],
  ['parallel-cap', 'server/projects.js', 'if (active >= this.limits.maxParallel)', 'if (false)', 'parallel dispatch respects'],
  ['relay-provenance', 'server/native.js', "source: { kind: 'agent-message'", "source: { kind: 'user'", 'native relay preserves'],
  ['provider-schema', 'index.js', "parameters: { type: 'object', properties, required: requiredKeys, additionalProperties: false }", 'parameters', 'registered tools use provider-valid'],
  ['desktop-membership', 'server/native.js', 'create({ workspaceId: workspace.id })', 'create({ cwd })', 'native desktop sessions are created'],
  ['external-delegation', 'index.js', "if (!exec.agent) return;", 'return;', 'registered tools use provider-valid'],
  ['client-tab-body', 'client/app.js', "key: TAB, children:", "key: 'wrong-body', children:", 'client owns its embedded slot'],
  ['recovery-replay', 'server/recovery.js', 'message?.recoveryHold', 'false', 'held lead deliveries survive observation'],
  ['desktop-navigation', 'client/app.js', 'pendingProject = p;', '', 'project navigation waits'],
  ['joined-session-title', 'server/projects.js', "info.events.findLast(e => e.type === 'session/title')", 'info.events.findLast(e => false)', 'join only explicitly selected'],
  ['delivery-source-version', 'server/delivery.js', 'args.sourceToken !== deliveryToken(p)', 'false', 'delivery version check rejects'],
  ['delivery-applicability', 'server/delivery.js', 'artifact.basis === workBasis(p, artifact.workId)', 'true', 'delivery changed contracts invalidate'],
];
const runs = [];
for (const [name, file, before, after, expected] of mutations) {
  const dir = await mkdtemp(join(tmpdir(), `project-mutant-${name}-`));
  for (const entry of ['package.json', 'index.js', 'server', 'client', 'config', 'tests']) await cp(join(root, entry), join(dir, entry), { recursive: true });
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'), 'dir');
  const original = await readFile(join(dir, file), 'utf8');
  if (!original.includes(before)) throw Error(`${name}: mutation target missing`);
  await writeFile(join(dir, file), original.replace(before, after));
  let output = '', exitCode = 0;
  try { const result = await run(process.execPath, ['--test', 'tests/desktop-contract.test.mjs', 'tests/projects.test.mjs', 'tests/recovery.test.mjs', 'tests/delivery.test.mjs'], { cwd: dir }); output = result.stdout + result.stderr; }
  catch (e) { exitCode = e.code; output = (e.stdout || '') + (e.stderr || ''); }
  const failures = output.split('\n').filter(line => /^✖|^not ok/.test(line));
  const killed = exitCode !== 0 && failures.some(line => line.includes(expected));
  runs.push({ name, killed, exitCode, failures, directory: dir });
  console.log(`${killed ? 'KILLED' : 'SURVIVED'} ${name}: ${failures[0] || 'no matching test failure'}`);
}
const report = join(root, '.acceptance/evidence/mutations.json');
await mkdir(dirname(report), { recursive: true });
await writeFile(report, JSON.stringify(runs, null, 2) + '\n');
if (runs.some(r => !r.killed)) process.exitCode = 1;
