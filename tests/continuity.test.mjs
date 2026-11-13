import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { Store } from '../server/store.js';
import { Projects } from '../server/projects.js';
import { Native } from '../server/native.js';
import { Continuity, continuityContext, continuityPackage, continuityState } from '../server/continuity.js';

const registered = JSON.parse(await readFile(new URL('../config/hyperparams.yaml', import.meta.url), 'utf8'));
const limits = Object.fromEntries(Object.entries(registered).map(([key, item]) => [key, item.value]));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'workbench-continuity-'));
  const store = await new Store(join(dir, 'projects.json')).open();
  const sessions = new Map(), deliveries = [];
  const native = new Native({ agents: sessions, sessionController: {
    async inspect(id) {
      const s = sessions.get(id); if (!s) throw Error('missing session');
      return { meta: { cwd: s.cwd, title: s.title }, events: structuredClone(s.events) };
    },
  } });
  native.create = async (cwd, title, mode) => {
    const id = `session-${sessions.size}`;
    sessions.set(id, { cwd, title, mode, status: 'idle', events: [], inbox: { nextTurn: [], nextStep: [] } });
    return id;
  };
  native.deliver = async message => {
    const s = sessions.get(message.target); if (!s) throw Error('missing target');
    deliveries.push(structuredClone(message));
    s.events.push({ type: 'user/message', data: { id: message.id } });
    s.status = 'running';
  };
  const worktrees = { async repo(path) { return { path, gitRoot: path }; } };
  const projects = new Projects(store, native, worktrees, limits);
  const p = await projects.create({ title: 'Continuity demo', paths: ['/synthetic-project'], instructions: '保留已有成果' });
  const continuity = new Continuity(store, native, projects, limits);
  const drain = async () => { while (projects.driving) await projects.driving; if (projects.flushing) await projects.flushing; };
  const worker = async () => {
    const sessionId = await native.create('/synthetic-project', 'Worker', 'research');
    const t = { id: `thread-${sessionId}`, sessionId, title: 'Read sources', mode: 'research', phase: 'review',
      task: '核对资料', summary: '执行者声明已经核对', generation: 1, reportedGeneration: 1,
      dependsOn: [], nodes: [], created: '2026-11-13T00:00:00Z', updated: '2026-11-13T00:00:00Z' };
    await store.change(state => { state.projects.find(x => x.id === p.id).threads.push(t); });
    return t;
  };
  const enqueue = async (id, sender, extra = {}) => {
    await store.change(state => { state.outbox.push({ id, projectId: p.id, sender, target: p.lead,
      text: '合成工作汇报', sent: false, cancelled: false, error: '', ...extra }); });
  };
  const view = () => {
    const current = store.state.projects.find(item => item.id === p.id);
    return { state: structuredClone(continuityState(current)), package: continuityPackage(current, native),
      pendingReports: store.state.outbox.filter(m => m.projectId === p.id && m.target === current.lead && !m.sent && !m.cancelled).length };
  };
  return { store, sessions, deliveries, native, projects, continuity, p, drain, worker, enqueue, view };
}

test('legacy projects read with an empty continuity view; decisions persist and retain replacement history', async () => {
  const f = await fixture();
  assert.equal(f.store.state.projects[0].continuity, undefined);
  assert.equal(f.view().state.revision, 0);
  const first = await f.continuity.decision({ projectId: f.p.id, expectedRevision: 0, text: '先核对当前结果', rationale: '避免重复工作' });
  const second = await f.continuity.decision({ projectId: f.p.id, expectedRevision: 1, text: '先处理已确认阻塞', supersedesId: first.decision.id });
  const reopened = await new Store(f.store.path).open();
  const c = reopened.state.projects[0].continuity;
  assert.equal(c.revision, 2); assert.equal(c.decisions.length, 2);
  assert.equal(c.decisions[0].status, 'superseded');
  assert.equal(c.decisions[0].supersededBy, second.decision.id);
  assert.equal(c.decisions[1].supersedes, first.decision.id);
  assert.equal(c.decisions[1].status, 'active');
  await assert.rejects(f.continuity.decision({ projectId: f.p.id, expectedRevision: 1, text: 'stale change' }), /已更新/);
  assert.equal(f.view().state.decisions.length, 2);
});

test('revision checks are transactional and decisions cannot replace another project or an already replaced decision', async () => {
  const f = await fixture();
  const result = await Promise.allSettled([
    f.continuity.decision({ projectId: f.p.id, expectedRevision: 0, text: 'one' }),
    f.continuity.decision({ projectId: f.p.id, expectedRevision: 0, text: 'two' }),
  ]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
  const d = f.view().state.decisions[0];
  const other = await f.projects.create({ title: 'Other project', paths: ['/synthetic-other'] });
  await assert.rejects(f.continuity.decision({ projectId: other.id, expectedRevision: 0, text: 'bad', supersedesId: d.id }), /本项目/);
  await f.continuity.decision({ projectId: f.p.id, expectedRevision: 1, text: 'replacement', supersedesId: d.id });
  await assert.rejects(f.continuity.decision({ projectId: f.p.id, expectedRevision: 2, text: 'bad', supersedesId: d.id }), /当前有效/);
  await assert.rejects(f.continuity.handoff({ projectId: f.p.id, expectedRevision: -1 }), /有效.*版本/);
});

test('handoff packages bind project versions and observed evidence without upgrading a worker summary to acceptance', async () => {
  const f = await fixture(), t = await f.worker();
  await f.store.change(state => {
    state.projects[0].coordination = { revision: 7, goal: '可靠接续', criteria: ['保留成果'], order: [t.id] };
  });
  await f.continuity.decision({ projectId: f.p.id, expectedRevision: 0, text: '先检查在途任务' });
  const saved = await f.continuity.handoff({ projectId: f.p.id, expectedRevision: 1, nextStep: '先核对线程报告' });
  const pack = f.view().state.handoffs.find(h => h.id === saved.handoff.id).package;
  assert.equal(pack.source.projectId, f.p.id); assert.equal(pack.source.continuityRevision, 2);
  assert.equal(pack.coordination.revision, 7); assert.equal(pack.coordination.order[0], t.id);
  assert.equal(pack.decisions[0].text, '先检查在途任务');
  assert.equal(pack.threads[0].evidence.kind, 'thread-record');
  assert.equal(pack.threads[0].phase, 'review');
  assert.equal(pack.threads[0].evidence.accepted, undefined);
  assert.match(pack.threads[0].evidence.note, /不据此新增验收/);
  assert.equal(pack.nextStep.source.kind, 'project-panel-note');
  await f.store.change(state => { state.projects[0].threads[0].summary = '后续报告'; });
  assert.equal(f.view().state.handoffs[0].package.threads[0].evidence.summary, '执行者声明已经核对');
  assert.equal(f.view().package.threads[0].evidence.summary, '后续报告');
  assert.equal(f.deliveries.length, 0);
});

test('continuity context and read pages stay bounded and complete reads reject mixed sources', async () => {
  const f = await fixture(), t = await f.worker();
  const content = '有效决定必须完整保留'.repeat(limits.maxText / 10);
  await f.store.change(state => {
    const p = state.projects[0];
    p.threads[0].task = '任务'.repeat(limits.maxText / 2);
    p.threads[0].summary = '报告'.repeat(limits.maxText / 2);
    p.continuity = { revision: 1, handoffs: [], previousLeads: [], decisions: Array.from({ length: limits.continuityPreviewItems + 2 }, (_, i) =>
      ({ id: `decision-${i}`, text: content, rationale: content, status: 'active', createdAt: '2026-11-13T00:00:00Z', supersedes: null, supersededBy: null })) };
  });
  const context = continuityContext(f.store.state.projects[0], f.native, limits);
  assert(context.length <= limits.continuityContextChars);
  assert.match(context, /omittedActiveDecisions.*2/);
  assert.match(context, /省略|须按需读取/);
  assert(!context.includes(f.store.state.projects[0].threads[0].task));
  const preview = f.projects.list()[0].continuity;
  assert.equal(preview.decisions.length, limits.continuityPreviewItems);
  assert.equal(preview.counts.active, limits.continuityPreviewItems + 2);
  let page = f.continuity.read({ projectId: f.p.id, section: 'decision', id: 'decision-0' });
  const first = page, parts = [];
  while (true) {
    assert(page.text.length <= limits.continuityReadChars); parts.push(page.text);
    if (page.nextOffset === null) break;
    page = f.continuity.read({ projectId: f.p.id, section: 'decision', id: 'decision-0', offset: page.nextOffset, sourceToken: page.sourceToken });
  }
  assert.equal(JSON.parse(parts.join('')).text, content);
  assert.throws(() => f.continuity.read({ projectId: f.p.id, section: 'decision', id: 'decision-0', offset: first.nextOffset }), /sourceToken/);
  await f.continuity.decision({ projectId: f.p.id, expectedRevision: 1, text: '替代决定', supersedesId: 'decision-0' });
  assert.throws(() => f.continuity.read({ projectId: f.p.id, section: 'decision', id: 'decision-0', offset: first.nextOffset, sourceToken: first.sourceToken }), /来源已变化/);
  const current = f.continuity.read({ projectId: f.p.id });
  assert.equal(f.continuity.read({ projectId: f.p.id }).sourceToken, current.sourceToken, 'read timestamps must not invalidate unchanged facts');
  await f.store.change(state => { state.projects[0].threads.find(item => item.id === t.id).summary = '新的现场证据'; });
  assert.throws(() => f.continuity.read({ projectId: f.p.id, offset: current.nextOffset, sourceToken: current.sourceToken }), /来源已变化/);
  assert.throws(() => f.continuity.read({ projectId: f.p.id, section: 'decision', id: 'foreign' }), /不属于/);
  const saved = await f.continuity.handoff({ projectId: f.p.id, expectedRevision: 2 });
  assert.equal(saved.handoff.package, undefined, 'mutation responses return references rather than all snapshot bodies');
  assert.equal(f.projects.list()[0].continuity.handoffs[0].package, undefined);
  const historic = f.continuity.read({ projectId: f.p.id, section: 'handoff', id: saved.handoff.id });
  await f.store.change(state => { state.projects[0].threads[0].summary = '再次变化'; });
  assert.equal(f.continuity.read({ projectId: f.p.id, section: 'handoff', id: saved.handoff.id }).sourceToken, historic.sourceToken);
});

test('safe revision exhaustion refuses every mutation before creating another session', async () => {
  const f = await fixture();
  await f.store.change(state => { state.projects[0].continuity = { revision: Number.MAX_SAFE_INTEGER, decisions: [], handoffs: [], previousLeads: [], deliveryPaused: true }; });
  const before = structuredClone(f.store.state), size = f.sessions.size;
  for (const method of ['decision', 'handoff', 'takeover', 'begin'])
    await assert.rejects(f.continuity[method]({ projectId: f.p.id, expectedRevision: Number.MAX_SAFE_INTEGER, text: '不得提交' }), /版本已达上限/);
  assert.equal(f.sessions.size, size); assert.deepEqual(f.store.state, before);
});

test('an invalid existing continuity record fails visibly instead of discarding it', async () => {
  const f = await fixture();
  await f.store.change(state => { state.projects[0].continuity = { revision: 1, decisions: 'invalid', handoffs: [], previousLeads: [] }; });
  assert.throws(() => f.view(), /记录格式/);
  assert.equal(f.store.state.projects[0].continuity.decisions, 'invalid');
});

test('takeover preserves workers and history, grants only the new lead scheduling authority, and stays idle', async () => {
  const f = await fixture(), t = await f.worker();
  const before = structuredClone(f.store.state.projects[0].threads);
  const result = await f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 });
  const p = f.projects.list()[0];
  assert.notEqual(result.lead, f.p.lead); assert.equal(p.lead, result.lead);
  assert.deepEqual(f.store.state.projects[0].threads, before);
  assert.equal(f.sessions.get(t.sessionId).mode, 'research');
  assert.equal(f.sessions.get(result.lead).mode, 'research');
  assert.equal(f.sessions.get(result.lead).status, 'idle');
  assert.equal(f.deliveries.length, 0); assert.equal(p.continuity.deliveryPaused, true);
  assert.equal(p.continuity.previousLeads[0].sessionId, f.p.lead);
  assert.equal(f.projects.status(f.p.lead).lead, result.lead);
  assert.match(f.projects.context(f.p.lead), /历史总对话/);
  assert.equal((await f.projects.read(f.p.lead, t.id)).thread.id, t.id);
  await assert.rejects(f.projects.dispatch(f.p.lead, { title: 'forbidden', task: 'no' }), /只有项目总对话/);
  const other = await f.projects.create({ title: 'Other', paths: ['/synthetic-other'] });
  await assert.rejects(f.projects.join(other.id, f.p.lead), /已属于/);
  await f.continuity.decision({ projectId: f.p.id, expectedRevision: 1, text: '接手后新确认的决定' });
  assert.match(f.projects.context(result.lead), /接手后新确认的决定/);
  assert.equal(f.deliveries.length, 0);
});

test('takeover requires observable loaded idle state, including empty inboxes', async () => {
  for (const state of ['running', 'missing', 'pending', 'unobservable']) {
    const f = await fixture(), agent = f.sessions.get(f.p.lead);
    if (state === 'running') agent.status = 'running';
    if (state === 'missing') f.sessions.delete(f.p.lead);
    if (state === 'pending') agent.inbox.nextTurn.push({ id: 'pending' });
    if (state === 'unobservable') delete agent.inbox;
    const count = f.sessions.size;
    await assert.rejects(f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 }), /尚不能安全接手/);
    assert.equal(f.sessions.size, count, state);
    assert.equal(f.store.state.projects[0].lead, f.p.lead);
  }
});

test('a lead becoming active while its replacement is created keeps the original binding and the new unused session', async () => {
  const f = await fixture(), create = f.native.create;
  let created;
  f.native.create = async (...args) => {
    created = await create(...args); f.sessions.get(f.p.lead).status = 'running'; return created;
  };
  await assert.rejects(f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 }), error => {
    assert.equal(error.createdSessionId, created); assert.match(error.message, /旧关联保持不变/); return true;
  });
  assert.equal(f.store.state.projects[0].lead, f.p.lead);
  assert.equal(continuityState(f.store.state.projects[0]).revision, 0);
  assert(f.sessions.has(created)); assert.equal(f.deliveries.length, 0);
});

test('a concurrent decision change invalidates a pending takeover without discarding that decision or the created session', async () => {
  const f = await fixture(), create = f.native.create;
  let created;
  f.native.create = async (...args) => {
    created = await create(...args);
    await f.continuity.decision({ projectId: f.p.id, expectedRevision: 0, text: 'during creation' });
    return created;
  };
  await assert.rejects(f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 }), /已更新/);
  assert.equal(f.store.state.projects[0].lead, f.p.lead);
  assert.equal(f.view().state.decisions[0].text, 'during creation');
  assert(f.sessions.has(created)); assert.equal(f.deliveries.length, 0);
});

test('receipt inspection failure preserves the old binding and identifies the unused new session', async () => {
  const f = await fixture();
  f.native.inspect = async () => { throw Error('receipt source unavailable'); };
  await assert.rejects(f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 }), error => {
    assert(error.createdSessionId); assert(f.sessions.has(error.createdSessionId)); return true;
  });
  assert.equal(f.store.state.projects[0].lead, f.p.lead);
  assert.equal(f.deliveries.length, 0);
});

test('a newly created lead joined elsewhere during receipt inspection is not bound to two projects', async () => {
  const f = await fixture();
  const other = await f.projects.create({ title: 'Other', paths: ['/synthetic-other'] });
  const create = f.native.create, inspect = f.native.inspect.bind(f.native);
  let created;
  f.native.create = async (...args) => { created = await create(...args); return created; };
  f.native.inspect = async id => {
    const result = await inspect(id);
    if (id === f.p.lead) await f.projects.join(other.id, created);
    return result;
  };
  await assert.rejects(f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 }), /接手期间加入其他项目/);
  assert.equal(f.store.state.projects[0].lead, f.p.lead);
  assert.equal(f.store.state.projects[1].threads[0].sessionId, created);
  assert.equal(f.deliveries.length, 0);
});

test('unacknowledged reports are checked and rerouted once; activation never clears recovery holds', async () => {
  const f = await fixture(), t = await f.worker();
  await f.enqueue('unsent', t.sessionId);
  await f.enqueue('accepted-before-ack', t.sessionId, { error: 'ack write failed' });
  await f.enqueue('already-sent', t.sessionId, { sent: true });
  await f.enqueue('cancelled', t.sessionId, { cancelled: true });
  await f.enqueue('recovery-held', t.sessionId, { recoveryHold: true });
  await f.enqueue('delivery-error', t.sessionId, { error: 'needs explicit retry', recoveryHold: true });
  f.sessions.get(f.p.lead).events.push({ type: 'user/message', data: { id: 'accepted-before-ack' } });
  const result = await f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 });
  const message = id => f.store.state.outbox.find(m => m.id === id);
  assert.equal(message('unsent').target, result.lead);
  assert.equal(message('accepted-before-ack').sent, true);
  assert.equal(message('accepted-before-ack').target, f.p.lead);
  assert.equal(message('already-sent').target, f.p.lead);
  assert.equal(message('cancelled').target, f.p.lead);
  assert.equal(message('recovery-held').target, result.lead);
  assert.equal(message('recovery-held').recoveryHold, true);
  assert.equal(message('delivery-error').target, result.lead);
  assert.equal(message('delivery-error').error, 'needs explicit retry');
  assert.equal(message('delivery-error').recoveryHold, true);
  await f.projects.flush(); assert.equal(f.deliveries.length, 0);
  await f.projects.report(t.sessionId, { summary: '接手后的新报告' }); await f.drain();
  assert.equal(f.deliveries.length, 0, 'new reports also stay paused before the explicit action');
  assert.equal(f.view().pendingReports, 4);
  await f.continuity.begin({ projectId: f.p.id, expectedRevision: 1 });
  assert.equal(f.deliveries.length, 2);
  assert(f.deliveries.every(m => m.target === result.lead));
  assert.equal(f.deliveries.filter(m => m.id === 'unsent').length, 1);
  assert.equal(message('recovery-held').sent, false);
  assert.equal(message('recovery-held').recoveryHold, true);
  assert.equal(message('delivery-error').sent, false);
  await f.projects.flush(); assert.equal(f.deliveries.length, 2);
});

test('a flush that scanned the old target waits for takeover and re-reads the paused new target', async () => {
  const f = await fixture(), t = await f.worker();
  await f.enqueue('race-report', t.sessionId);
  const entered = deferred(), release = deferred(), create = f.native.create;
  f.native.create = async (...args) => { const id = await create(...args); entered.resolve(); await release.promise; return id; };
  const changing = f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 });
  await entered.promise;
  const flushing = f.projects.flush();
  release.resolve();
  const result = await changing; await flushing;
  assert.equal(f.store.state.outbox[0].target, result.lead);
  assert.equal(f.deliveries.length, 0);
  await f.continuity.begin({ projectId: f.p.id, expectedRevision: 1 });
  assert.equal(f.deliveries.length, 1); assert.equal(f.deliveries[0].target, result.lead);
});

test('takeover waits for an in-flight delivery and then rejects a lead that has started running', async () => {
  const f = await fixture(), t = await f.worker();
  await f.enqueue('inflight', t.sessionId);
  const entered = deferred(), release = deferred(), deliver = f.native.deliver;
  f.native.deliver = async m => { entered.resolve(); await release.promise; await deliver(m); };
  const flushing = f.projects.flush(); await entered.promise;
  const changing = f.continuity.takeover({ projectId: f.p.id, expectedRevision: 0 });
  const rejected = assert.rejects(changing, /尚不能安全接手/);
  release.resolve(); await flushing; await rejected;
  assert.equal(f.sessions.size, 2); assert.equal(f.store.state.projects[0].lead, f.p.lead);
  assert.equal(f.deliveries.length, 1); assert.equal(f.store.state.outbox[0].sent, true);
});

test('dispatch checks the current lead inside the transaction for both new and existing threads', async () => {
  for (const existing of [false, true]) {
    const f = await fixture(), t = await f.worker(), gate = deferred();
    const newLead = await f.native.create('/synthetic-project', 'new', 'research');
    const switching = f.store.change(async state => {
      await gate.promise;
      const p = state.projects[0]; p.lead = newLead;
      p.continuity = { revision: 1, decisions: [], handoffs: [], previousLeads: [{ sessionId: f.p.lead }] };
    });
    const pending = f.projects.dispatch(f.p.lead, { title: 'late request', task: 'do not schedule', ...(existing ? { thread_id: t.id } : {}) });
    const rejected = assert.rejects(pending, /只有当前项目总对话/);
    gate.resolve(); await switching; await rejected;
    assert.equal(f.store.state.projects[0].threads.length, 1);
    assert.equal(f.store.state.projects[0].threads[0].task, '核对资料');
    assert.equal(f.deliveries.length, 0);
  }
});

test('native state never treats an unloaded or pending coordinator as idle and reports partially created sessions', async () => {
  const agents = new Map();
  const native = new Native({ agents,
    workspaceRegistry: { async create() { return { id: 'workspace' }; } },
    sessionController: { async create() { return { sessionId: 'created' }; }, async rename() { throw Error('rename unavailable'); } },
  });
  assert.equal(native.running('missing'), false);
  assert.equal(native.coordinatorState('missing').state, 'unknown');
  agents.set('lead', { status: 'idle', inbox: { nextTurn: [], nextStep: [] } });
  assert.equal(native.coordinatorState('lead').state, 'idle');
  agents.get('lead').inbox.nextStep.push({ id: 'queued' });
  assert.equal(native.coordinatorState('lead').state, 'unknown');
  await assert.rejects(native.create('/synthetic', 'test', 'research'), error => {
    assert.equal(error.createdSessionId, 'created'); return true;
  });
});

function uiHarness() {
  let values = [], index = 0;
  const React = {
    useState(initial) {
      const slot = index++;
      if (!(slot in values)) values[slot] = typeof initial === 'function' ? initial() : initial;
      return [values[slot], value => { values[slot] = typeof value === 'function' ? value(values[slot]) : value; }];
    },
    useEffect() {}, useRef: () => ({ current: null }), Fragment: 'fragment',
  };
  const sandbox = { React, LIMITS: limits, BUILD: 'test', h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }) };
  return { sandbox, render(fn) { index = 0; return fn(); }, reset() { values = []; index = 0; } };
}
function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...(tree.children || []).flatMap(elements)];
}
function button(tree, label) { return elements(tree).find(n => n.type === 'button' && n.children.includes(label)); }

test('the blank project page exposes management and takeover requires a separate explicit report activation', async () => {
  const source = (await Promise.all(['continuity.js', 'app.js'].map(path => readFile(new URL(`../client/${path}`, import.meta.url), 'utf8')))).join('\n');
  const ui = uiHarness();
  vm.runInNewContext(source + '\nthis.panel=ContinuityPanel;this.setRpc=value=>{rpc=value};this.page=(project)=>{useProjects=()=>[{projects:[project],loading:false},async()=>{}];return ProjectPage({})};', ui.sandbox);
  const p = { id: 'p', title: 'Demo', lead: 'old', repos: [], threads: [], leadState: { state: 'idle', reason: '已核对' },
    continuity: { revision: 0, decisions: [], handoffs: [], previousLeads: [], deliveryPaused: false } };
  let tree = ui.render(() => ui.sandbox.page(p));
  button(tree, '管理项目').props.onClick();
  tree = ui.render(() => ui.sandbox.page(p));
  assert(elements(tree).some(n => n.type === ui.sandbox.panel), 'management must be reachable before any model message');
  ui.reset();
  const calls = [];
  ui.sandbox.setRpc({ async call(_path, method, args) {
    calls.push({ method, args: structuredClone(args) });
    if (method.endsWith('continuity-takeover')) return { ok: true, value: { lead: 'new', handoff: { package: {} } } };
    return { ok: true, value: { revision: 2 } };
  } });
  const props = { project: p, refresh: async () => {}, openProject() {}, openSession() {} };
  tree = ui.render(() => ui.sandbox.panel(props));
  await button(tree, '创建新总对话并接手').props.onClick();
  assert.equal(calls.length, 1); assert.equal(calls[0].method, 'project-workbench/continuity-takeover');
  assert.equal(calls[0].args.expectedRevision, 0);
  p.lead = 'new'; p.continuity.revision = 1; p.continuity.deliveryPaused = true;
  p.continuityDelivery = { pending: 2, recoveryHeld: 1 };
  tree = ui.render(() => ui.sandbox.panel(props));
  await button(tree, '开始接续并接收汇报').props.onClick();
  assert.equal(calls.length, 2); assert.equal(calls[1].method, 'project-workbench/continuity-begin');
  assert.equal(calls[1].args.expectedRevision, 1);
});

// A small hook host models component identity, effect dependencies, and ignored
// setters after unmount. It renders the real containers and panel event handlers.
function mountedUiHarness() {
  const instance = () => ({ hooks: [], mounted: true });
  const root = instance();
  let active, cursor = 0, child;
  const React = {
    useState(initial) {
      const owner = active, slot = cursor++;
      owner.hooks[slot] ||= { value: typeof initial === 'function' ? initial() : initial };
      return [owner.hooks[slot].value, update => {
        if (!owner.mounted) return;
        const value = typeof update === 'function' ? update(owner.hooks[slot].value) : update;
        if (!Object.is(value, owner.hooks[slot].value)) { owner.hooks[slot].value = value; owner.dirty = true; }
      }];
    },
    useEffect(effect, deps) {
      const owner = active, slot = cursor++, previous = owner.hooks[slot];
      if (!previous || !deps || deps.some((value, i) => !Object.is(value, previous.deps?.[i]))) {
        owner.effects.push(() => {
          previous?.cleanup?.();
          owner.hooks[slot] = { deps, cleanup: effect() };
        });
      }
    },
    useRef(initial) { return React.useState(() => ({ current: initial }))[0]; },
    Fragment: 'fragment',
  };
  const render = (owner, component) => {
    let tree;
    do {
      owner.dirty = false; owner.effects = []; active = owner; cursor = 0;
      tree = component();
      for (const effect of owner.effects) effect();
    } while (owner.dirty);
    return tree;
  };
  const sandbox = { React, LIMITS: limits, BUILD: 'test',
    h: (type, props, ...children) => ({ type, key: props?.key ?? null, props: props || {}, children: children.flat(Infinity) }) };
  return { sandbox,
    root: component => render(root, component),
    panel(element) {
      if (!child || child.key !== element.key || child.type !== element.type) {
        if (child) { child.mounted = false; for (const hook of child.hooks) hook?.cleanup?.(); }
        child = { ...instance(), key: element.key, type: element.type };
      }
      return render(child, () => element.type(element.props));
    },
  };
}
async function mountedContinuity() {
  const ui = mountedUiHarness();
  const source = (await Promise.all(['continuity.js', 'app.js'].map(path => readFile(new URL(`../client/${path}`, import.meta.url), 'utf8')))).join('\n');
  vm.runInNewContext(source + '\nthis.Panel=ContinuityPanel;this.Page=ProjectPage;this.Workspace=ThreadWorkspace;this.setRpc=value=>{rpc=value};this.setProjects=projects=>{useProjects=()=>[{projects,loading:false},async()=>{}]};', ui.sandbox);
  return ui;
}
function continuityProject(id) {
  return { id, title: id, lead: `${id}-lead`, repos: [], threads: [], leadState: { state: 'idle', reason: '已核对' },
    continuity: { revision: 0, decisions: [], handoffs: [], previousLeads: [], deliveryPaused: false } };
}
function inputField(tree, label) {
  const owner = elements(tree).find(node => node.type === 'label' && node.children.includes(label));
  return owner?.children.find(node => node?.type === 'input' || node?.type === 'textarea');
}
function typeInto(field, value) { if (!field.props.disabled) field.props.onChange({ target: { value } }); }

for (const mount of ['project-page', 'thread-workspace']) {
  for (const operation of ['read', 'save']) {
    test(`${mount}: a delayed ${operation} response cannot change another project's continuity panel`, async () => {
      const ui = await mountedContinuity(), projects = [continuityProject('P1'), continuityProject('P2')];
      ui.sandbox.setProjects(projects);
      const pending = deferred(), calls = [];
      ui.sandbox.setRpc({ call(_path, method, args) { calls.push({ method, args }); return pending.promise; } });
      let selected = 0, parent, element;
      const container = () => ui.root(() => mount === 'project-page' ? ui.sandbox.Page({}) : ui.sandbox.Workspace({ sessionId: projects[selected].lead }));
      const select = index => {
        selected = index; parent = container();
        if (mount === 'project-page') {
          elements(parent).filter(node => node.type === 'button' && node.children.includes('管理项目'))[index].props.onClick();
          parent = container();
        }
        element = elements(parent).find(node => node.type === ui.sandbox.Panel);
        assert(element, 'the real container must expose its continuity panel');
        return ui.panel(element);
      };
      let panel = select(0), request;
      if (operation === 'read') request = button(panel, '查看当前接续信息').props.onClick();
      else {
        typeInto(inputField(panel, '决定内容'), 'P1 submitted decision');
        panel = ui.panel(element);
        request = elements(panel).find(node => node.type === 'form' && button(node, '保存决定')).props.onSubmit({ preventDefault() {} });
      }
      assert.equal(calls[0].args.projectId, 'P1');
      panel = select(1);
      typeInto(inputField(panel, '决定内容'), 'P2 unsaved draft');
      pending.resolve({ ok: true, value: operation === 'read'
        ? { text: 'P1-only evidence', offset: 0, nextOffset: null, totalChars: 16, readAt: 'synthetic', note: 'P1 record' }
        : { revision: 1, decision: { id: 'P1-decision' } } });
      await request;
      panel = ui.panel(element);
      assert.equal(inputField(panel, '决定内容').props.value, 'P2 unsaved draft');
      assert(!elements(panel).some(node => node.type === 'pre'), 'P1 evidence must not appear under P2');
      assert(!elements(panel).some(node => node.props?.role === 'status'), 'P1 completion must not report success in P2');
    });
  }
}

for (const saving of ['decision', 'handoff']) {
  test(`pending ${saving} save protects decision and handoff drafts until its response`, async () => {
    const ui = await mountedContinuity(), project = continuityProject('P');
    const pending = deferred(), calls = [];
    ui.sandbox.setRpc({ call(_path, method, args) { calls.push({ method, args }); return pending.promise; } });
    const element = { key: project.id, type: ui.sandbox.Panel, props: { project, refresh: async () => {}, openProject() {}, openSession() {} } };
    const labels = ['决定内容', '理由（可选）', '替代的决定 ID（留空表示新增）', '下一步说明（可选）'];
    let panel = ui.panel(element);
    for (const label of labels) typeInto(inputField(panel, label), `original ${label}`);
    panel = ui.panel(element);
    const action = saving === 'decision' ? '保存决定' : '保存接续包';
    const request = elements(panel).find(node => node.type === 'form' && button(node, action)).props.onSubmit({ preventDefault() {} });
    panel = ui.panel(element);
    for (const label of labels) {
      assert.equal(inputField(panel, label).props.disabled, true, label);
      typeInto(inputField(panel, label), `later ${label}`);
    }
    panel = ui.panel(element);
    for (const label of labels) assert.equal(inputField(panel, label).props.value, `original ${label}`);
    assert.equal(calls[0].args[saving === 'decision' ? 'text' : 'nextStep'], `original ${saving === 'decision' ? labels[0] : labels[3]}`);
    pending.resolve({ ok: true, value: saving === 'decision' ? { revision: 1 } : { revision: 1, handoff: { id: 'saved' } } });
    await request;
    panel = ui.panel(element);
    for (const label of labels) assert.equal(inputField(panel, label).props.disabled, false, label);
    assert.equal(inputField(panel, '下一步说明（可选）').props.value, 'original 下一步说明（可选）');
    assert.equal(inputField(panel, '决定内容').props.value, saving === 'decision' ? '' : 'original 决定内容');
  });
}


test('current continuity guidance belongs to coordinators and does not replace an active worker task', async () => {
  const f = await fixture(), worker = await f.worker();
  assert.match(f.projects.context(f.p.lead), /项目接续摘要/);
  assert.doesNotMatch(f.projects.context(worker.sessionId), /项目接续摘要/);
  assert.match(f.projects.context(worker.sessionId), /你是工作线程/);
});
