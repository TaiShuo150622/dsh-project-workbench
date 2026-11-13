// Explicit, opt-in live trial against a combined workbench. Credentials stay in memory.
// Run on an isolated host in screen; use only a synthetic, read-only project directory.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const url = process.env.DSH_TRIAL_URL, token = process.env.DSH_TRIAL_TOKEN;
const cwd = process.env.DSH_TRIAL_PROJECT, evidence = process.env.DSH_TRIAL_EVIDENCE;
if (!url || !token || !cwd || !evidence) throw Error('Set DSH_TRIAL_URL, DSH_TRIAL_TOKEN, DSH_TRIAL_PROJECT, DSH_TRIAL_EVIDENCE');
await mkdir(evidence, { recursive: true });
const checkpoint = join(evidence, 'checkpoint.json');
let prior;
try { prior = JSON.parse(await readFile(checkpoint, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (prior) {
  const rejection = prior.steps.findLast(s => s.stage === 'I1-admitted')?.value;
  if (process.env.DSH_TRIAL_RESUME !== 'rejected-prompt' || rejection?.ok !== false || rejection.error?.message !== 'Remote payload must contain exactly one plain-object args field')
    throw Error('Existing trial requires inspection; automatic replay is refused');
}
const log = prior || { startedAt: new Date().toISOString(), transport: 'live-http-api', steps: [] };
async function record(stage, value) {
  log.steps.push({ stage, at: new Date().toISOString(), value });
  await writeFile(checkpoint, JSON.stringify(log, null, 2) + '\n');
  console.log(JSON.stringify({ stage, at: log.steps.at(-1).at }));
}
let cookie;
async function connect() {
  const auth = await fetch(new URL('/?token=' + encodeURIComponent(token), url), { redirect: 'manual' });
  if (auth.status !== 303) throw Error(`Authentication failed (${auth.status})`);
  cookie = auth.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  if (!cookie) throw Error('Missing authenticated transport cookie');
}
async function rpc(method, payload = {}) {
  const response = await fetch(new URL('/api/' + method, url), { method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method, payload }) });
  if (!response.ok) throw Error(`${method}: HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw Error(`${method}: ${body.error.message || JSON.stringify(body.error)}`);
  return body.result;
}
async function work(op, payload = {}) {
  const result = await rpc('project-workbench/' + op, payload);
  if (!result?.ok) throw Error(`${op}: ${result?.error?.message || 'missing result'}`);
  return result.value;
}
async function native(op, args) {
  const result = await rpc('session/' + op, { args: { request: args } });
  if (!result?.ok) throw Error(`${op}: ${result?.error?.message || 'missing result'}`);
  return result.value;
}
const files = ['README.md', 'modules/input.md', 'modules/acceptance.md'];
async function hashes() { return Object.fromEntries(await Promise.all(files.map(async file => [file, createHash('sha256').update(await readFile(join(cwd, file))).digest('hex')]))); }
let projectId;
async function current() { const list = await work('list'); if (list.error) throw Error(list.error); return list.projects.find(p => p.id === projectId); }
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFinished() {
  const deadline = Date.now() + 12 * 60_000;
  let previous = '', stable = 0;
  while (Date.now() < deadline) {
    const p = await current();
    const state = JSON.stringify({ lead: p.leadState.state, threads: p.threads.map(t => ({ id: t.id, phase: t.phase, running: t.running })), pending: p.continuityDelivery.pending });
    if (state !== previous) { await record('model-progress', JSON.parse(state)); previous = state; }
    if (p.threads.some(t => ['failed', 'waiting_user'].includes(t.phase))) { await record('model-needs-attention', p); throw Error('A worker needs attention; original sessions are preserved'); }
    if (p.threads.length === 2 && p.threads.every(t => ['review', 'completed'].includes(t.phase) && !t.running) && p.leadState.state === 'idle' && p.continuityDelivery.pending === 0) stable++;
    else stable = 0;
    if (stable >= 2) return p;
    await delay(2_000);
  }
  throw Error('Trial wait expired; original tasks remain running and must not be restarted');
}

try {
  await connect();
  const beforeFiles = prior ? prior.steps.find(s => s.stage === 'before-create').value.files : await hashes();
  const goal = '两个模块共同交付一份可核对的验收说明', criteria = ['说明包含输入约束与最终核对步骤'];
  let created;
  if (prior) {
    const saved = prior.steps.find(s => s.stage === 'created').value;
    created = { id: saved.projectId, lead: saved.lead }; projectId = created.id;
    const existing = await current();
    assert.equal(existing.threads.length, 0); assert.equal(existing.leadState.state, 'idle');
    await record('resume-rejected-prompt', { projectId });
  } else {
  await record('before-create', { files: beforeFiles, existing: (await work('list')).projects.map(p => ({ id: p.id, threads: p.threads.map(t => t.id) })) });
  created = await work('create', { title: 'Harness 三线接口试验', paths: [cwd], instructions: '只读检查本合成示例目录，不读取目录之外的资料，不修改文件；工作汇报不是用户验收。' });
  projectId = created.id; log.projectId = projectId;
  await record('created', { projectId, lead: created.lead });

  await work('coordination-update', { projectId, expectedRevision: 0, goal, criteria, order: [] });
  const conflict = await work('coordination-update', { projectId, expectedRevision: 0, goal: '过期编辑不得覆盖', criteria: [], order: [] });
  assert.equal(conflict.conflict, true);
  assert.equal((await work('coordination-read', { projectId })).goal, goal);
  const first = await work('continuity-decision', { projectId, expectedRevision: 0, text: '首轮使用Markdown说明' });
  await work('continuity-decision', { projectId, expectedRevision: 1, text: '首轮使用Markdown说明及验收清单', supersedesId: first.decision.id });
  }
  let p = await current();
  assert.equal(p.continuity.decisions.filter(d => d.status === 'active').length, 1);
  await record('goal-and-decisions', p);
  const prompt = '只读检查示例项目，分成输入约束和验收步骤两条研究线程，结束后汇总；不修改文件。';
  const requestId = prior ? prior.steps.find(s => s.stage === 'before-I1-prompt').value.requestId : randomUUID();
  await record('before-I1-prompt', { sessionId: p.lead, requestId, prompt });
  const admitted = await native('prompt', { sessionId: p.lead, requestId, mode: 'queue', content: [{ type: 'text', text: prompt }] });
  await record('I1-admitted', admitted);
  p = await waitFinished();
  assert.ok(p.threads.every(t => t.mode === 'research' && t.summary && t.adoptedCoordination.goal === goal));
  const workerIds = p.threads.map(t => ({ id: t.id, sessionId: t.sessionId, generation: t.generation }));
  const firstOutput = await native('wait', { sessionId: p.lead, timeoutMs: 1_000, maxMessages: 20 });
  await record('I1-finished', { project: p, output: firstOutput });
  await work('coordination-update', { projectId, expectedRevision: p.coordination.revision, goal, criteria, order: p.threads.map(t => t.id).reverse() });
  await work('continuity-handoff', { projectId, expectedRevision: p.continuity.revision, nextStep: '先核对两条研究汇报与当前有效决定，说明已完成事项和下一步；不重复创建任务。' });
  p = await current();
  await record('before-takeover', p);
  const takeover = await work('continuity-takeover', { projectId, expectedRevision: p.continuity.revision });
  p = await current();
  assert.notEqual(p.lead, created.lead);
  assert.equal(p.continuity.deliveryPaused, true);
  assert.deepEqual(p.threads.map(t => ({ id: t.id, sessionId: t.sessionId, generation: t.generation })), workerIds);
  await record('takeover', { takeover, project: p });
  await work('continuity-begin', { projectId, expectedRevision: p.continuity.revision });
  const prompt2 = '根据当前有效决定和接续包，说明已完成事项与下一步，不新建任务。';
  const requestId2 = randomUUID();
  await record('before-I2-prompt', { sessionId: p.lead, requestId: requestId2, prompt: prompt2 });
  await native('prompt', { sessionId: p.lead, requestId: requestId2, mode: 'queue', content: [{ type: 'text', text: prompt2 }] });
  await waitFinished();
  const secondOutput = await native('wait', { sessionId: p.lead, timeoutMs: 1_000, maxMessages: 20 });
  assert.ok(secondOutput?.output?.records?.length, 'the new coordinator must produce a recorded answer');
  await record('I2-finished', { project: await current(), output: secondOutput });
  await work('recovery-check', { projectId });
  await connect();
  p = await current();
  assert.deepEqual(p.threads.map(t => ({ id: t.id, sessionId: t.sessionId, generation: t.generation })), workerIds);
  assert.deepEqual(await hashes(), beforeFiles);
  await record('PASS', { project: p, unchangedFiles: true, noDuplicateWorkers: true, browserVerified: false });
} catch (error) {
  await record('INCOMPLETE', { message: error.message });
  process.exitCode = 1;
}
