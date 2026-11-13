import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Store } from '../server/store.js';
import { Projects } from '../server/projects.js';
import { Native, accepted } from '../server/native.js';
import { Worktrees } from '../server/worktrees.js';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const run = promisify(execFile);
const config = JSON.parse(await readFile(new URL('../config/hyperparams.yaml', import.meta.url)));
const limits = Object.fromEntries(Object.entries(config).map(([key, v]) => [key, v.value]));

async function fixture(overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'project-workbench-test-'));
  const store = await new Store(join(dir, 'projects.json')).open();
  const sessions = new Map(); const deliveries = [];
  const native = {
    runtime: { id: 'test-runtime', startedAt: '2026-11-13T00:00:00.000Z', platform: 'linux', arch: 'arm64' },
    async create(cwd, title, mode) { const id = `s${sessions.size}`; sessions.set(id, { cwd, title, mode, running: false, events: [] }); return id; },
    running(id) { return sessions.get(id)?.running || false; },
    runtimeState(id) { return sessions.has(id) ? (sessions.get(id).running ? 'running' : 'idle') : 'unknown'; },
    async observe(id) { const runtimeState = this.runtimeState(id); return { runtimeState, reason: runtimeState === 'unknown' ? 'session-not-loaded' : `agent-${runtimeState}` }; },
    async inspect(id) { const s = sessions.get(id); if (!s) throw Error('missing session'); return { meta: { cwd: s.cwd, title: s.title }, events: s.events }; },
    async deliver(m) { deliveries.push(m); if (!sessions.has(m.target)) throw Error('missing target'); sessions.get(m.target).running = true; },
    async stop(id) { sessions.get(id).running = false; },
  };
  const worktrees = { async repo(path) { return { path, gitRoot: path }; }, async create(repo, p, t) { return { path: `/isolated/${p}/${t}`, base: 'base', branch: 'branch' }; } };
  const service = new Projects(store, native, worktrees, { ...limits, ...overrides });
  const p = await service.create({ title: '测试项目', paths: ['/repo'], instructions: '独立完成后汇报' });
  const drain = async () => { while (service.driving) await service.driving; if (service.flushing) await service.flushing; };
  return { dir, store, sessions, deliveries, native, service, p, drain };
}
test('parallel dispatch respects the configured limit and task dependencies', async () => {
  const f = await fixture({ maxParallel: 2 });
  const a = await f.service.dispatch(f.p.lead, { title: 'A', task: 'read A' }, 'a');
  const b = await f.service.dispatch(f.p.lead, { title: 'B', task: 'read B' }, 'b');
  const c = await f.service.dispatch(f.p.lead, { title: 'C', task: 'combine', depends_on: [a.id, b.id] }, 'c');
  const d = await f.service.dispatch(f.p.lead, { title: 'D', task: 'independent fourth' }, 'd');
  await f.drain();
  let p = f.service.list()[0];
  assert.equal(p.threads.filter(t => t.phase === 'running').length, 2);
  assert.equal(p.threads.find(t => t.id === c.id).phase, 'queued');
  assert.equal(p.threads.find(t => t.id === d.id).phase, 'queued');
  for (const t of p.threads.filter(t => t.phase === 'running')) {
    await f.service.report(t.sessionId, { summary: '实际结果', outcome: 'review' });
    f.sessions.get(t.sessionId).running = false;
    await f.service.onIdle(t.sessionId);
  }
  await f.drain(); p = f.service.list()[0];
  assert.equal(p.threads.find(t => t.id === c.id).phase, 'running');
  assert.equal(f.deliveries.filter(m => m.target === f.p.lead).length, 2);
});
test('worker cannot dispatch; foreign session and foreign thread cannot be controlled', async () => {
  const f = await fixture();
  const t = await f.service.dispatch(f.p.lead, { title: 'A', task: 'read' }); await f.drain();
  const worker = f.service.list()[0].threads[0].sessionId;
  await assert.rejects(f.service.dispatch(worker, { title: 'nested', task: 'no' }), /只有项目总对话/);
  await assert.rejects(f.service.dispatch('outsider', { title: 'x', task: 'no' }), /尚未加入/);
  const p2 = await f.service.create({ title: '另一个', paths: ['/other'] });
  await assert.rejects(f.service.read(p2.lead, t.id), /不属于/);
  await assert.rejects(f.service.report(f.p.lead, { summary: '冒充完成' }), /不能冒充/);
});
test('stable dispatch key prevents duplicated workers', async () => {
  const f = await fixture();
  const a = await f.service.dispatch(f.p.lead, { title: 'A', task: 'read' }, 'same-call');
  const b = await f.service.dispatch(f.p.lead, { title: 'A', task: 'read' }, 'same-call');
  await f.drain(); assert.equal(a.id, b.id); assert.equal(f.service.list()[0].threads.length, 1);
});
test('code creates an isolated worktree; continuation reuses the session and edits', async () => {
  const f = await fixture();
  const initial = await f.service.dispatch(f.p.lead, { title: 'code', task: 'modify', mode: 'code' }); await f.drain();
  const t = f.service.list()[0].threads[0];
  assert.match(f.sessions.get(t.sessionId).cwd, /^\/isolated\//);
  assert.equal(f.sessions.get(t.sessionId).mode, 'code');
  await f.service.report(t.sessionId, { summary: 'first result' }); f.sessions.get(t.sessionId).running = false;
  await f.service.dispatch(f.p.lead, { thread_id: initial.id, task: 'improve result' }); await f.drain();
  assert.equal(f.service.list()[0].threads[0].sessionId, t.sessionId); assert.equal(f.sessions.size, 2);
});
test('follow-up to a running worker is delivered after its current turn, not lost in its report', async () => {
  const f = await fixture();
  await f.service.dispatch(f.p.lead, { title: 'A', task: 'first' }); await f.drain();
  const t = f.service.list()[0].threads[0];
  await f.service.dispatch(f.p.lead, { thread_id: t.id, task: 'second' });
  await f.service.report(t.sessionId, { summary: 'first finished' });
  f.sessions.get(t.sessionId).running = false; await f.service.onIdle(t.sessionId); await f.drain();
  const next = f.service.list()[0].threads[0];
  assert.equal(next.task, 'second'); assert.equal(next.generation, 2); assert.equal(next.phase, 'running');
  assert.equal(f.deliveries.filter(m => m.target === t.sessionId).length, 2);
});
test('pausing does not cancel running work; stopped pending delivery never starts', async () => {
  const f = await fixture({ maxParallel: 1 });
  await f.service.dispatch(f.p.lead, { title: 'A', task: 'a' }); await f.drain();
  const queued = await f.service.dispatch(f.p.lead, { title: 'B', task: 'b' }); await f.drain();
  await f.service.action(f.p.id, queued.id, 'stop');
  await f.service.action(f.p.id, null, 'pause');
  assert.equal(f.service.list()[0].threads[0].running, true);
  await assert.rejects(f.service.dispatch(f.p.lead, { title: 'C', task: 'c' }), /暂停/);
  assert.equal(f.service.list()[0].threads[1].phase, 'stopped');
});
test('restore keeps completed work and exposes interrupted work without rerunning it', async () => {
  const f = await fixture(); await f.service.dispatch(f.p.lead, { title: 'A', task: 'a' }); await f.drain();
  const t = f.service.list()[0].threads[0]; f.sessions.get(t.sessionId).running = false;
  const restored = new Projects(await new Store(f.store.path).open(), f.native, {}, limits);
  await restored.recover(); while (restored.driving) await restored.driving;
  assert.equal(restored.list()[0].threads[0].phase, 'interrupted');
  assert.equal(restored.list()[0].threads[0].sessionId, t.sessionId);
  assert.equal(f.deliveries.length, 1);
});
test('restore does not replay an unacknowledged task; pause still delivers worker results', async () => {
  const f = await fixture(); await f.service.dispatch(f.p.lead, { title: 'A', task: 'a' }); await f.drain();
  const t = f.service.list()[0].threads[0]; f.sessions.get(t.sessionId).running = false;
  await f.store.change(s => { s.outbox[0].sent = false; });
  const restored = new Projects(await new Store(f.store.path).open(), f.native, {}, limits);
  await restored.recover(); while (restored.driving) await restored.driving;
  assert.equal(f.deliveries.length, 1, 'an unsent message must not restart interrupted work');
  await restored.action(f.p.id, t.id, 'retry'); while (restored.driving) await restored.driving;
  assert.equal(f.deliveries.length, 2);
  await restored.action(f.p.id, null, 'pause'); while (restored.driving) await restored.driving;
  await restored.report(t.sessionId, { summary: 'done while project paused' }); while (restored.driving) await restored.driving;
  assert.equal(f.deliveries.at(-1).target, f.p.lead);
  assert.match(f.deliveries.at(-1).text, /done while project paused/);
});
test('join only explicitly selected ordinary sessions and retains their history', async () => {
  const f = await fixture(); const id = await f.native.create('/other', 'existing');
  f.sessions.get(id).events.push({ type: 'assistant/message', data: { content: [{ type: 'text', text: 'old result' }] } });
  f.sessions.get(id).events.push({ type: 'session/title', data: { title: 'Latest native title' } });
  const joined = await f.service.join(f.p.id, id);
  assert.equal(joined.sessionId, id); assert.equal(f.deliveries.length, 0);
  assert.equal(joined.title, 'Latest native title');
  assert.equal((await f.service.read(f.p.lead, joined.id)).messages[0].text, 'old result');
  await assert.rejects(f.service.join(f.p.id, id), /已属于/);
});
test('persisted relay acceptance detects history and current inbox, not removed pending messages', () => {
  assert(accepted([{ type: 'user/message', data: { id: 'm' } }], 'm'));
  const events = [{ type: 'agent/inbox/spliced', data: { target: 'next-turn', start: 0, inserted: [{ id: 'm' }] } }];
  assert(accepted(events, 'm'));
  events.push({ type: 'agent/inbox/spliced', data: { target: 'next-turn', start: 0, removedCount: 1, inserted: [] } });
  assert.equal(accepted(events, 'm'), false);
});
test('native relay preserves agent provenance and stable identity across retry', async () => {
  const events = [], received = [];
  const agent = { session: { snapshotEvents: () => events }, inbox: { nextTurn: [], nextStep: [] }, followup: m => { received.push(m); events.push({ type: 'user/message', data: m }); } };
  const native = new Native({ sessionController: { resolveAgent: async () => ({ agent }) }, sessionPersistence: { flush: async () => {} } });
  const m = { id: 'stable', sender: 'lead', target: 'worker', text: 'do work' };
  await native.deliver(m); await native.deliver(m);
  assert.equal(received.length, 1); assert.equal(received[0].source.kind, 'agent-message'); assert.equal(received[0].id, 'stable');
  assert(Object.isFrozen(received[0].content));
});
test('real git isolation preserves dirty source and reports changes without merging', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'project-git-test-'));
  const git = args => run('git', ['-C', dir, ...args]);
  await git(['init']); await git(['config', 'user.email', 'test@example.invalid']); await git(['config', 'user.name', 'Test']);
  await writeFile(join(dir, 'a.txt'), 'baseline\n'); await git(['add', 'a.txt']); await git(['commit', '-m', 'baseline']);
  await writeFile(join(dir, 'a.txt'), 'user edits\n');
  const trees = new Worktrees(await mkdtemp(join(tmpdir(), 'project-trees-test-')), limits);
  const wt = await trees.create(await trees.repo(dir), 'project-1', 'thread-1');
  assert.equal(wt.sourceDirty, true); assert.equal(await readFile(join(wt.path, 'a.txt'), 'utf8'), 'baseline\n');
  await writeFile(join(wt.path, 'a.txt'), 'worker edits\n');
  const diff = await trees.diff({ worktree: wt }); assert.match(diff.text, /worker edits/);
  assert.equal(await readFile(join(dir, 'a.txt'), 'utf8'), 'user edits\n');
});
test('invalid durable state fails visibly, never silently resets existing projects', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'project-bad-test-'));
  await writeFile(join(dir, 'projects.json'), '{broken');
  await assert.rejects(new Store(join(dir, 'projects.json')).open(), SyntaxError);
});
