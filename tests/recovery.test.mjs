import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { Store } from '../server/store.js';
import { Projects } from '../server/projects.js';
import { Native } from '../server/native.js';
import { Worktrees } from '../server/worktrees.js';
import { agentObservation, observeSession, runtimeInstance } from '../server/recovery.js';

const config = JSON.parse(await readFile(new URL('../config/hyperparams.yaml', import.meta.url)));
const limits = Object.fromEntries(Object.entries(config).map(([key, item]) => [key, item.value]));
const runtime = { id: 'test-instance', startedAt: '2026-11-13T00:00:00.000Z', platform: 'linux', arch: 'arm64' };
const baseThread = {
  id: 'worker-thread', sessionId: 'worker', title: 'Synthetic work', task: 'Continue the original task',
  mode: 'code', phase: 'running', generation: 1, repoIndex: 0, summary: 'Preserved partial result',
  worktree: { path: '/synthetic/worktree', branch: 'synthetic-branch', base: 'synthetic-base' },
  dependsOn: [], nodes: [], dispatchKeys: ['original-request'],
};

async function fixture(threads = [baseThread]) {
  const store = await new Store(join(await mkdtemp(join(tmpdir(), 'project-recovery-')), 'projects.json')).open();
  const p = { id: 'project', title: 'Synthetic project', lead: 'lead', repos: [{ path: '/synthetic/repo', gitRoot: '/synthetic/repo' }], paused: false, instructions: '', threads: structuredClone(threads) };
  await store.change(s => { s.projects.push(p); });
  const states = new Map([['lead', 'idle'], ...threads.filter(t => t.sessionId).map(t => [t.sessionId, 'running'])]);
  const effects = { created: [], delivered: [], stopped: [], repaired: [] };
  const native = {
    runtime: { ...runtime },
    running(id) { return states.get(id) === 'running'; },
    runtimeState(id) { return states.get(id) || 'unknown'; },
    async observe(id) { const runtimeState = this.runtimeState(id); return { runtimeState, reason: runtimeState === 'unknown' ? 'session-not-loaded' : runtimeState === 'missing' ? 'session-not-found' : `agent-${runtimeState}` }; },
    async inspect() { return { meta: { cwd: '/synthetic/repo' }, events: [] }; },
    async create() { const id = `new-session-${effects.created.length + 1}`; effects.created.push(id); states.set(id, 'idle'); return id; },
    async deliver(message) { effects.delivered.push(structuredClone(message)); states.set(message.target, 'running'); },
    async stop(id) { effects.stopped.push(id); states.set(id, 'idle'); },
    async ensureWorkspace(id) { effects.repaired.push(id); },
  };
  const worktrees = { async create() { throw Error('Unexpected new worktree'); } };
  const service = new Projects(store, native, worktrees, limits);
  const drain = async () => { while (service.driving || service.flushing) await (service.driving || service.flushing); };
  return { store, p, states, native, service, effects, drain };
}

test('native observation does not load or control cold agents and treats uninspectable inboxes as unknown', async () => {
  const agents = new Map([
    ['running', { status: 'running' }],
    ['idle', { status: 'idle', inbox: { nextTurn: [], nextStep: [] } }],
    ['pending', { status: 'idle', inbox: { nextTurn: [{ id: 'pending' }], nextStep: [] } }],
    ['incomplete', { status: 'idle' }],
  ]);
  const inspected = [], effects = [];
  const ctx = { agents, sessionController: {
    async inspect(id) {
      inspected.push(id);
      if (id === 'missing') throw Object.assign(Error('Not found'), { code: 'session/not-found' });
      if (id === 'offline') throw Error('Do not expose this transport detail');
      return { meta: {}, events: [] };
    },
    async resolveAgent() { effects.push('resolve'); throw Error('Must not activate'); },
    async create() { effects.push('create'); }, async prompt() { effects.push('prompt'); },
  } };
  const native = new Native(ctx);
  for (const [id, expected] of [['running', 'running'], ['idle', 'idle'], ['pending', 'unknown'], ['incomplete', 'unknown'], ['cold', 'unknown'], ['missing', 'missing'], ['offline', 'unknown']]) {
    assert.equal((await native.observe(id)).runtimeState, expected, id);
  }
  assert.deepEqual(await native.observe(null), { runtimeState: 'missing', reason: 'session-not-assigned' });
  assert.equal(native.runtimeState('cold'), 'unknown');
  assert.equal(agents.has('cold'), false);
  assert.deepEqual(inspected, ['cold', 'missing', 'offline']);
  assert.deepEqual(effects, []);
  assert.equal(agentObservation({ status: 'idle', inbox: { nextTurn: {}, nextStep: [] } }).runtimeState, 'unknown');
  assert.equal(agentObservation({ status: 'idle', inbox: { nextTurn: [], nextStep: [{}] } }).reason, 'pending-input');
});

test('runtime metadata is anonymous and stable for this process, and observation filters adapter details', async () => {
  const first = runtimeInstance(), second = new Native({ agents: new Map() }).runtime;
  assert.deepEqual(first, second);
  assert.deepEqual(Object.keys(first).sort(), ['arch', 'id', 'platform', 'startedAt']);
  assert.match(first.id, /^[0-9a-f-]{36}$/);
  const f = await fixture();
  Object.assign(f.native.runtime, { hostname: 'private-host', username: 'private-user', ip: 'private-address' });
  f.native.observe = async () => ({ runtimeState: 'unexpected-state', reason: 'private transport detail' });
  const view = await f.service.checkRecovery(f.p.id);
  assert.deepEqual(Object.keys(view.runtime).sort(), ['arch', 'id', 'platform', 'startedAt']);
  assert.deepEqual(Object.keys(view.currentRuntime).sort(), ['arch', 'id', 'platform', 'startedAt']);
  assert.equal(view.threads[0].runtimeState, 'unknown');
  assert.equal(view.threads[0].reason, 'inspection-unavailable');
  assert.doesNotMatch(JSON.stringify(view), /private-/);
  assert.deepEqual(await observeSession({ async observe() { throw Error('private-error'); } }, 'session'), { runtimeState: 'unknown', reason: 'inspection-unavailable' });
});

test('checking original tasks only archives observation and preserves phases, evidence, messages and holds', async () => {
  const f = await fixture([{ ...baseThread, recoveryHold: true }]);
  await f.store.change(s => s.outbox.push({ id: 'old', projectId: f.p.id, target: 'worker', sent: false, recoveryHold: true }));
  const before = f.store.snapshot();
  let kicks = 0; f.service.kick = () => { kicks += 1; };
  const observed = await f.service.checkRecovery(f.p.id);
  assert.ok(Date.parse(observed.checkedAt));
  assert.equal(observed.threads[0].runtimeState, 'running');
  const after = f.store.snapshot(); delete after.projects[0].recovery;
  assert.deepEqual(after, before);
  assert.deepEqual(f.effects, { created: [], delivered: [], stopped: [], repaired: [] });
  assert.equal(kicks, 0);
  const reopened = await new Store(f.store.path).open();
  assert.deepEqual(reopened.state.projects[0].recovery, f.store.state.projects[0].recovery);
});

test('startup retains unknown active tasks and completed results without automatically starting a scheduler', async () => {
  const f = await fixture([baseThread, { ...baseThread, id: 'completed-thread', sessionId: 'completed', phase: 'completed', summary: 'Accepted result' }]);
  f.states.set('worker', 'unknown'); f.states.set('completed', 'idle');
  await f.store.change(s => s.outbox.push({ id: 'old', projectId: f.p.id, sender: 'lead', target: 'worker', text: 'original input', sent: false, error: '' }));
  await f.service.recover();
  const p = f.store.state.projects[0];
  assert.equal(p.threads[0].phase, 'running', 'unknown must not be relabelled as interrupted or failed');
  assert.equal(p.threads[0].summary, baseThread.summary);
  assert.deepEqual(p.threads[0].worktree, baseThread.worktree);
  assert.equal(p.threads[1].phase, 'completed');
  assert.equal(p.threads[1].summary, 'Accepted result');
  assert.equal(p.threads[1].recoveryHold, undefined);
  assert.equal(f.service.driving, null);
  f.service.kick(); await f.drain();
  assert.equal(f.effects.delivered.length, 0);
  assert.equal(f.effects.created.length, 0);
  assert.equal(f.store.state.outbox[0].recoveryHold, true);
});

test('held lead deliveries survive observation and coordinator redirection until explicit idle retry', async () => {
  const f = await fixture();
  await f.store.change(s => s.outbox.push({ id: 'report', projectId: f.p.id, sender: 'worker', target: 'lead', text: 'saved result', sent: false, error: '' }));
  await f.service.recover();
  await f.service.checkRecovery(f.p.id);
  f.service.kick(); await f.drain();
  assert.equal(f.effects.delivered.length, 0);
  f.states.set('new-lead', 'idle');
  await f.store.change(s => { s.projects[0].lead = 'new-lead'; s.outbox[0].target = 'new-lead'; });
  await f.service.checkRecovery(f.p.id);
  f.service.kick(); await f.drain();
  assert.equal(f.store.state.outbox[0].recoveryHold, true);
  assert.equal(f.effects.delivered.length, 0, 'redirection must not release a held historical result');
  f.states.set('new-lead', 'running');
  await assert.rejects(f.service.action(f.p.id, null, 'retry_delivery'), /运行|核对/);
  assert.equal(f.store.state.outbox[0].recoveryHold, true);
  f.states.set('new-lead', 'idle');
  await f.service.action(f.p.id, null, 'retry_delivery'); await f.drain();
  assert.equal(f.effects.delivered.length, 1);
  assert.equal(f.effects.delivered[0].target, 'new-lead');
  assert.equal(f.effects.delivered[0].id, 'report');
});

test('explicit continuation rejects unknown, missing or running tasks and stale generations', async () => {
  const f = await fixture([{ ...baseThread, phase: 'interrupted', recoveryHold: true }]);
  for (const state of ['unknown', 'missing', 'running']) {
    f.states.set('worker', state); await f.service.checkRecovery(f.p.id);
    const before = f.store.snapshot();
    await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry'), /核对|运行|空闲/);
    assert.deepEqual(f.store.snapshot(), before);
  }
  f.states.set('worker', 'idle'); await f.service.checkRecovery(f.p.id);
  f.states.set('worker', 'running');
  await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry'), /运行/);
  f.states.set('worker', 'idle');
  await f.store.change(s => { s.projects[0].threads[0].generation += 1; });
  await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry'), /先核对/);
  assert.equal(f.effects.created.length + f.effects.delivered.length, 0);
});

test('a cold active task can be explicitly continued after loading and checking its idle original session', async () => {
  const f = await fixture();
  f.states.set('worker', 'unknown'); await f.service.recover();
  f.states.set('worker', 'idle');
  await f.service.checkRecovery(f.p.id);
  assert.equal(f.store.state.projects[0].threads[0].phase, 'running', 'checking must not change the task phase');
  assert.equal(f.effects.delivered.length, 0);
  await f.service.action(f.p.id, baseThread.id, 'retry'); await f.drain();
  const t = f.store.state.projects[0].threads[0];
  assert.equal(t.sessionId, baseThread.sessionId);
  assert.deepEqual(t.worktree, baseThread.worktree);
  assert.equal(t.summary, baseThread.summary);
  assert.equal(t.generation, 2);
  assert.equal(f.effects.created.length, 0);
  assert.equal(f.effects.delivered.length, 1);
});

test('untouched historical queued work needs explicit continuation while prior start evidence prevents blind creation', async () => {
  const queued = { ...baseThread, sessionId: undefined, worktree: undefined, summary: '', phase: 'queued', mode: 'research' };
  const f = await fixture([queued]);
  await f.service.recover(); f.service.kick(); await f.drain();
  assert.equal(f.effects.created.length, 0);
  assert.equal(f.service.list()[0].threads[0].resumeUnstarted, true);
  await f.service.action(f.p.id, queued.id, 'retry'); await f.drain();
  assert.equal(f.effects.created.length, 1);
  assert.equal(f.effects.delivered.length, 1);
  assert.equal(f.store.state.projects[0].threads[0].generation, 1, 'an unstarted queue entry is still its original generation');
  const uncertain = await fixture([{ ...queued, startAttempted: true }]);
  await uncertain.service.recover();
  await assert.rejects(uncertain.service.action(uncertain.p.id, queued.id, 'retry'), /核对/);
  assert.equal(uncertain.effects.created.length, 0);
});

test('completed and review results cannot be rerun through generic recovery even when their session is idle', async () => {
  for (const phase of ['completed', 'review']) {
    const f = await fixture([{ ...baseThread, phase, recoveryHold: true }]);
    f.states.set('worker', 'idle'); await f.service.checkRecovery(f.p.id);
    const before = f.store.snapshot();
    await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry'), /不能.*重跑/);
    assert.deepEqual(f.store.snapshot(), before);
    assert.equal(f.effects.delivered.length + f.effects.created.length, 0);
  }
});

test('unknown existing sessions block new continuation, queued starts and saved followups', async () => {
  const f = await fixture([{ ...baseThread, phase: 'review', followups: ['saved next task'] }]);
  f.states.set('worker', 'unknown');
  await assert.rejects(f.service.dispatch(f.p.lead, { thread_id: baseThread.id, task: 'do more' }), /无法确认/);
  f.service.kick(); await f.drain();
  assert.deepEqual(f.store.state.projects[0].threads[0].followups, ['saved next task']);
  await f.store.change(s => { s.projects[0].threads[0].phase = 'queued'; });
  f.service.kick(); await f.drain();
  assert.equal(f.store.state.projects[0].threads[0].phase, 'queued');
  assert.equal(f.effects.created.length + f.effects.delivered.length, 0);
});

test('queued starts recheck pause and lifecycle closure after idle observation', async () => {
  for (const change of ['pause', 'close']) {
    const f = await fixture([{ ...baseThread, phase: 'queued' }]);
    f.states.set('worker', 'idle');
    let entered, release;
    const observing = new Promise(resolve => { entered = resolve; });
    const barrier = new Promise(resolve => { release = resolve; });
    const observe = f.native.observe.bind(f.native);
    f.native.observe = async id => {
      if (id === 'worker') { entered(); await barrier; }
      return observe(id);
    };
    f.service.kick();
    await observing;
    if (change === 'pause') await f.service.action(f.p.id, null, 'pause');
    else f.service.closed = true;
    release(); await f.drain();
    const t = f.store.state.projects[0].threads[0];
    assert.equal(t.phase, 'queued', change);
    assert.equal(t.startAttempted, undefined, change);
    assert.equal(t.summary, baseThread.summary);
    assert.equal(f.store.state.outbox.length, 0);
    assert.equal(f.effects.created.length + f.effects.delivered.length, 0);
  }
});

test('ambiguous delivery preserves the running phase and holds its original message without automatic resend', async () => {
  const f = await fixture([{ ...baseThread, phase: 'queued' }]);
  f.states.set('worker', 'idle');
  f.native.deliver = async message => {
    f.effects.delivered.push(structuredClone(message)); f.states.set(message.target, 'running');
    throw Error('Persistence reply lost after acceptance');
  };
  f.service.kick(); await f.drain();
  const first = f.store.snapshot();
  assert.equal(first.projects[0].threads[0].phase, 'running');
  assert.equal(first.projects[0].threads[0].recoveryHold, true);
  assert.equal(first.outbox[0].recoveryHold, true);
  assert.equal(first.outbox[0].sent, false);
  await f.service.checkRecovery(f.p.id);
  f.service.kick(); await f.drain();
  assert.equal(f.effects.delivered.length, 1);
  await assert.rejects(f.service.action(f.p.id, null, 'retry_delivery'), /单独核对/);
  assert.equal(f.store.state.projects[0].threads[0].summary, baseThread.summary);
});

test('a recovered pending followup cannot silently replace a new explicit instruction', async () => {
  const f = await fixture([{ ...baseThread, phase: 'completed', followups: ['Earlier queued instruction'] }]);
  f.states.set('worker', 'idle'); await f.service.recover();
  const result = await f.service.dispatch(f.p.lead, { thread_id: baseThread.id, task: 'New explicit instruction' }).catch(error => error);
  await f.drain();
  assert.ok(result instanceof Error, 'new input must be rejected visibly while historical followups await a choice');
  assert.match(result.message, /后续任务/);
  assert.equal(f.store.state.projects[0].threads[0].phase, 'completed');
  assert.equal(f.store.state.projects[0].threads[0].summary, baseThread.summary);
  assert.deepEqual(f.store.state.projects[0].threads[0].followups, ['Earlier queued instruction']);
  assert.equal(f.effects.delivered.length, 0);
});

test('explicit queued followup continuation preserves the old result and dispatches only the queued instruction', async () => {
  for (const phase of ['completed', 'review', 'waiting_user']) {
    const f = await fixture([{ ...baseThread, phase, followups: ['Earlier queued instruction'] }]);
    f.states.set('worker', 'idle'); await f.service.recover();
    await f.service.action(f.p.id, baseThread.id, 'retry_followup'); await f.drain();
    const t = f.store.state.projects[0].threads[0];
    assert.equal(t.task, 'Earlier queued instruction');
    assert.equal(t.summary, baseThread.summary);
    assert.equal(t.sessionId, baseThread.sessionId);
    assert.equal(t.generation, 2);
    assert.deepEqual(t.followups, []);
    assert.equal(f.effects.created.length, 0);
    assert.equal(f.effects.delivered.length, 1);
    assert.match(f.effects.delivered[0].text, /^Earlier queued instruction/);
  }
});

test('queued followup continuation requires a fresh idle check and cannot substitute for an active task', async () => {
  const f = await fixture([{ ...baseThread, phase: 'review', followups: ['Later'] }]);
  f.states.set('worker', 'unknown'); await f.service.recover();
  await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry_followup'), /核对|空闲/);
  f.states.set('worker', 'idle'); await f.service.checkRecovery(f.p.id);
  f.states.set('worker', 'running');
  await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry_followup'), /运行/);
  f.states.set('worker', 'idle');
  await f.store.change(s => { s.projects[0].threads[0].phase = 'running'; });
  await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry_followup'), /后续任务|原任务/);
  assert.equal(f.effects.delivered.length, 0);
});

test('a provably uncreated worktree or session can be explicitly resumed without losing a saved worktree', async () => {
  const fresh = { ...baseThread, sessionId: undefined, worktree: undefined, phase: 'queued', summary: '' };
  const f = await fixture([fresh]);
  let worktreeCalls = 0;
  f.service.worktrees.create = async () => { worktreeCalls++; throw Object.assign(Error('Preflight unavailable'), { worktreeNotCreated: true }); };
  f.service.kick(); await f.drain();
  assert.equal(f.store.state.projects[0].threads[0].creationRecovery.sessionState, 'not-created');
  f.service.worktrees.create = async () => { worktreeCalls++; return { ...baseThread.worktree }; };
  const originalCreate = f.native.create.bind(f.native);
  f.native.create = async () => { throw Object.assign(Error('Workspace unavailable'), { sessionNotCreated: true }); };
  await f.service.checkRecovery(f.p.id);
  await f.service.action(f.p.id, fresh.id, 'retry'); await f.drain();
  assert.deepEqual(f.store.state.projects[0].threads[0].worktree, baseThread.worktree);
  f.native.create = originalCreate;
  await f.service.checkRecovery(f.p.id);
  await f.service.action(f.p.id, fresh.id, 'retry'); await f.drain();
  assert.equal(worktreeCalls, 2, 'the successfully created worktree must be reused');
  assert.equal(f.effects.created.length, 1);
  assert.equal(f.effects.delivered.filter(m => m.target !== 'lead').length, 1);
});

test('post-create failure preserves the original session and requires permission verification before continuation', async () => {
  const f = await fixture([{ ...baseThread, sessionId: undefined, phase: 'queued' }]);
  const originalCreate = f.native.create.bind(f.native);
  f.native.create = async () => { const id = await originalCreate(); throw Object.assign(Error('Permission setup failed'), { createdSessionId: id }); };
  let verified = false, checks = 0;
  f.native.verifySession = async () => { checks++; if (!verified) throw Error('原会话权限待修复'); };
  f.service.kick(); await f.drain();
  const savedId = f.store.state.projects[0].threads[0].sessionId;
  assert.equal(savedId, 'new-session-1');
  await f.service.checkRecovery(f.p.id);
  await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry'), /权限/);
  assert.equal(f.effects.created.length, 1);
  verified = true;
  await f.service.action(f.p.id, baseThread.id, 'retry'); await f.drain();
  assert.ok(checks >= 2);
  assert.equal(f.store.state.projects[0].threads[0].sessionId, savedId);
  assert.equal(f.effects.created.length, 1);
  assert.equal(f.effects.delivered.filter(m => m.target === savedId).length, 1);
});

test('uncertain session or worktree creation remains held and never creates a replacement automatically', async () => {
  for (const stage of ['session', 'worktree']) {
    const f = await fixture([{ ...baseThread, sessionId: undefined, worktree: stage === 'worktree' ? undefined : baseThread.worktree, phase: 'queued' }]);
    f.native.create = async () => { throw Error('Create reply lost'); };
    f.service.worktrees.create = async () => { throw Error('Worktree result unknown'); };
    f.service.kick(); await f.drain();
    const t = f.store.state.projects[0].threads[0];
    assert.equal(t.creationRecovery[stage === 'session' ? 'sessionState' : 'worktreeState'], 'unknown');
    await f.service.checkRecovery(f.p.id);
    await assert.rejects(f.service.action(f.p.id, baseThread.id, 'retry'), /创建结果|人工核对/);
    assert.equal(f.effects.created.length, 0);
  }
});

test('native creation errors distinguish pre-create failure from unknown creation and preserve returned identity', async () => {
  const ctx = { agents: new Map(), workspaceRegistry: { async create() { throw Error('Preflight failed'); } }, sessionController: {} };
  const native = new Native(ctx);
  await assert.rejects(native.create('/synthetic/repo', 'Title', 'research'), error => error.sessionNotCreated === true);
  ctx.workspaceRegistry.create = async () => ({ id: 'workspace' });
  ctx.sessionController.create = async () => { throw Error('Create reply lost'); };
  await assert.rejects(native.create('/synthetic/repo', 'Title', 'research'), error => error.sessionNotCreated === false && !error.createdSessionId);
  ctx.sessionController.create = async () => ({ sessionId: 'original-created' });
  ctx.sessionController.rename = async () => { throw Error('Rename failed'); };
  await assert.rejects(native.create('/synthetic/repo', 'Title', 'research'), error => error.createdSessionId === 'original-created');
  ctx.agents.set('original-created', { status: 'idle', session: {}, inbox: { nextTurn: [], nextStep: [] } });
  ctx.sandboxPolicy = { resolve: () => ({ mode: 'danger-full-access' }) };
  await assert.rejects(native.verifySession('original-created', '/synthetic/repo', 'research'), /只读/);
  ctx.sandboxPolicy.resolve = () => ({ mode: 'read-only' });
  await native.verifySession('original-created', '/synthetic/repo', 'research');
});

test('worktree errors only prove absence before the worktree-add operation begins', async () => {
  const trees = new Worktrees(await mkdtemp(join(tmpdir(), 'recovery-trees-')), limits);
  trees.git = async () => { throw Error('Read failed before worktree add'); };
  await assert.rejects(trees.create({ gitRoot: '/synthetic/repo' }, 'project', 'thread'), error => error.worktreeNotCreated === true);
  trees.git = async (_cwd, args) => { if (args[0] === 'worktree') throw Error('Worktree reply unknown'); return args[0] === 'rev-parse' ? 'base' : ''; };
  await assert.rejects(trees.create({ gitRoot: '/synthetic/repo' }, 'project', 'thread'), error => error.worktreeNotCreated === false);
});

test('explicit lead-report retry is scoped and is not blocked by a held unknown worker message', async () => {
  const f = await fixture();
  f.states.set('worker', 'unknown');
  await f.store.change(s => s.outbox.push(
    { id: 'worker-input', projectId: f.p.id, sender: 'lead', target: 'worker', text: 'uncertain input', sent: false, error: '' },
    { id: 'lead-report', projectId: f.p.id, sender: 'worker', target: 'lead', text: 'saved report', sent: false, error: '' },
  ));
  await f.service.recover();
  const result = await f.service.action(f.p.id, null, 'retry_delivery'); await f.drain();
  assert.equal(result.retriedReports, 1);
  assert.equal(f.effects.delivered.length, 1);
  assert.equal(f.effects.delivered[0].id, 'lead-report');
  assert.equal(f.store.state.outbox.find(m => m.id === 'worker-input').recoveryHold, true);
  assert.equal(f.store.state.outbox.find(m => m.id === 'worker-input').sent, false);
});

test('observations become stale across runtime or task identity changes and cannot certify a changed task', async () => {
  const f = await fixture();
  await f.service.checkRecovery(f.p.id);
  assert.equal(f.service.list()[0].recovery.stale, false);
  f.native.runtime = { ...runtime, id: 'new-instance' };
  assert.equal(f.service.list()[0].recovery.staleReason, 'runtime-changed');
  f.native.runtime = { ...runtime };
  f.states.set('worker', 'idle');
  assert.equal(f.service.list()[0].recovery.staleReason, 'observation-changed');
  const observe = f.native.observe.bind(f.native);
  f.native.observe = async id => {
    if (id === 'worker') await f.store.change(s => { s.projects[0].threads[0].generation += 1; });
    return observe(id);
  };
  const view = await f.service.checkRecovery(f.p.id);
  assert.equal(view.threads[0].runtimeState, 'unknown');
  assert.equal(view.threads[0].reason, 'task-changed-during-check');
  assert.equal(f.effects.delivered.length + f.effects.created.length, 0);
});

const clientSource = (await Promise.all(['coordination.js', 'continuity.js', 'recovery.js', 'graph.js', 'delivery.js', 'app.js'].map(file => readFile(new URL(`../client/${file}`, import.meta.url), 'utf8')))).join('\n');
function clientHarness(initial) {
  const hooks = [], effects = [], requests = [];
  let cursor = 0, offline = false;
  const sandbox = {
    React: {
      useState(value) {
        const index = cursor++;
        if (!(index in hooks)) hooks[index] = index === 0 && initial ? initial : value;
        return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }];
      },
      useRef(value) { const index = cursor++; if (!(index in hooks)) hooks[index] = { current: value }; return hooks[index]; },
      useEffect(fn) { effects.push(fn); },
    },
    h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(x => x !== false && x != null) }),
    LIMITS: { pollMs: 1000 }, BUILD: 'recovery-test', setTimeout: () => 1, clearTimeout() {},
    testRpc: { async call(_path, op, payload) { requests.push({ op, payload }); if (offline) throw Error('offline'); return { ok: true, value: { projects: initial?.projects || [] } }; } },
  };
  vm.runInNewContext(clientSource + '\nrpc=testRpc; this.exports={ProjectPage,RecoveryPanel,recoveryPresentation,recoveryCanRetry,useProjects};', sandbox);
  return { exports: sandbox.exports, effects, requests, offline(value) { offline = value; }, render(name, props) { cursor = 0; return sandbox.exports[name](props); } };
}
function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  return (node.children || []).map(child => findNode(child, predicate)).find(Boolean) || null;
}

test('project management can check an empty native conversation without sending a model message or opening its header', async () => {
  const p = { id: 'blank-project', lead: 'blank-lead', title: 'Blank', repos: [], threads: [] };
  const ui = clientHarness({ projects: [p], connected: true, loading: false, error: '' });
  let page = ui.render('ProjectPage', {});
  findNode(page, node => node.type === 'button' && node.children.includes('管理项目')).props.onClick();
  page = ui.render('ProjectPage', {});
  const panel = findNode(page, node => node.type?.name === 'RecoveryPanel');
  assert.ok(panel, 'management must be reachable before a conversation header mounts');
  await panel.props.onCheck();
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.requests[0].op, 'project-workbench/recovery-check');
  assert.equal(ui.requests[0].payload.projectId, p.id);
});

test('disconnect retains project results and marks the observation stale without changing task phases', async () => {
  const p = { id: 'project', threads: [{ ...baseThread, phase: 'review' }], recovery: { checkedAt: '2026-11-13T00:00:00.000Z', runtime, currentRuntime: runtime, stale: false, threads: [] } };
  const ui = clientHarness({ projects: [p], connected: true, loading: false, error: '' });
  ui.offline(true);
  const first = ui.render('useProjects');
  const cleanup = ui.effects[0]();
  await first[1]();
  const [state] = ui.render('useProjects');
  assert.equal(state.connected, false);
  assert.equal(state.projects[0].threads[0].phase, 'review');
  assert.equal(state.projects[0].threads[0].summary, baseThread.summary);
  assert.equal(ui.exports.recoveryPresentation(state.projects[0], state.connected).stale, true);
  cleanup();
});

test('check and explicit continue buttons remain separate and unknown or disconnected tasks cannot continue', () => {
  const thread = { ...baseThread, phase: 'running', recoveryHold: true, continueAvailable: true, runtimeState: 'idle', running: false };
  const p = { threads: [thread], recovery: { checkedAt: '2026-11-13T00:00:00.000Z', runtime, currentRuntime: runtime, stale: false, threads: [{ threadId: thread.id, sessionId: thread.sessionId, generation: thread.generation, runtimeState: 'idle', reason: 'agent-idle' }] } };
  const ui = clientHarness(); let checked = 0, continued = 0;
  const panel = ui.exports.RecoveryPanel({ project: p, connected: true, busy: false, onCheck: () => checked++, onContinue: () => continued++ });
  findNode(panel, node => node.type === 'button' && node.children.includes('核对原任务状态')).props.onClick();
  assert.equal(checked, 1); assert.equal(continued, 0);
  const resume = findNode(panel, node => node.type === 'button' && node.children.includes('继续原任务（可能接着执行）'));
  assert.equal(resume.props.disabled, false); resume.props.onClick();
  assert.equal(continued, 1);
  assert.equal(ui.exports.recoveryCanRetry(p, thread, false), false);
  assert.equal(ui.exports.recoveryCanRetry(p, { ...thread, runtimeState: 'unknown' }, true), false);
  assert.equal(ui.exports.recoveryCanRetry(p, { ...thread, running: true }, true), false);
});

test('the management panel exposes queued followup continuation separately from rerunning a completed task', () => {
  const thread = { ...baseThread, phase: 'completed', followups: ['Next instruction'], recoveryHold: true, continueAvailable: false, followupAvailable: true, runtimeState: 'idle', running: false };
  const p = { threads: [thread], recovery: { checkedAt: '2026-11-13T00:00:00.000Z', runtime, currentRuntime: runtime, stale: false, threads: [{ threadId: thread.id, sessionId: thread.sessionId, generation: thread.generation, runtimeState: 'idle', reason: 'agent-idle' }] } };
  const ui = clientHarness(); let followed = 0, retried = 0;
  const panel = ui.exports.RecoveryPanel({ project: p, connected: true, busy: false, onCheck() {}, onContinue: () => retried++, onFollowup: () => followed++ });
  const button = findNode(panel, node => node.type === 'button' && node.children.includes('继续已排队后续任务'));
  assert.ok(button, 'completed work with held followups needs an accessible separate action');
  assert.equal(button.props.disabled, false); button.props.onClick();
  assert.equal(followed, 1); assert.equal(retried, 0);
  assert.equal(thread.summary, baseThread.summary);
});
