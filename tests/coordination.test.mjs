import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { Store } from '../server/store.js';
import { Projects } from '../server/projects.js';
import { apply } from '../index.js';

const registered = JSON.parse(await readFile(new URL('../config/hyperparams.yaml', import.meta.url), 'utf8'));
const limits = Object.fromEntries(Object.entries(registered).map(([key, value]) => [key, value.value]));

async function fixture(overrides = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'coordination-test-'));
  const store = await new Store(join(dir, 'projects.json')).open();
  const sessions = new Map(), deliveries = [], stops = [];
  const native = {
    async create(cwd, title, mode) {
      const id = `session-${sessions.size}`;
      sessions.set(id, { cwd, title, mode, running: false, events: [] });
      return id;
    },
    running(id) { return sessions.get(id)?.running || false; },
    runtime: { id: 'coordination-test-runtime' },
    runtimeState(id) { const s = sessions.get(id); return !s ? 'missing' : s.running ? 'running' : 'idle'; },
    async observe(id) { const runtimeState = this.runtimeState(id); return { runtimeState, reason: `agent-${runtimeState}` }; },
    coordinatorState(id) { const s = sessions.get(id); return { state: !s ? 'unknown' : s.running ? 'running' : 'idle' }; },
    async inspect(id) { const s = sessions.get(id); return { meta: { cwd: s.cwd, title: s.title }, events: s.events }; },
    async deliver(message) { deliveries.push(message); sessions.get(message.target).running = true; },
    async stop(id) { stops.push(id); sessions.get(id).running = false; },
  };
  const worktrees = { async repo(path) { return { path, gitRoot: path }; } };
  const service = new Projects(store, native, worktrees, { ...limits, ...overrides });
  // Build a queued fixture without racing the scheduler; each scenario starts it explicitly.
  service.closed = true;
  const p = await service.create({ title: '合成协作项目', paths: ['/synthetic-repo'], instructions: '保留既有任务范围' });
  const drain = async () => { while (service.driving) await service.driving; if (service.flushing) await service.flushing; };
  const begin = async () => { service.closed = false; service.kick(); await drain(); };
  const finish = async id => {
    const t = service.list()[0].threads.find(t => t.id === id);
    await service.report(t.sessionId, { summary: `${t.title} 的合成验证结果`, outcome: 'review' });
    sessions.get(t.sessionId).running = false;
    await service.onIdle(t.sessionId); await drain();
  };
  const add = (title, dependencies = []) => service.dispatch(p.lead, { title, task: `完成 ${title}`, depends_on: dependencies });
  return { store, service, native, sessions, deliveries, stops, p, drain, begin, finish, add };
}

test('legacy coordination defaults are readable without rewriting project data, then persist across reopen', async () => {
  const f = await fixture(), t = await f.add('旧线程');
  await f.store.change(state => { delete state.projects[0].coordination; });
  const before = f.store.snapshot();
  const read = f.service.readCoordination(f.p.id);
  assert.deepEqual(read, { revision: 0, goal: '', criteria: [], order: [t.id] });
  read.criteria.push('不能修改源记录'); read.order.length = 0;
  assert.deepEqual(f.store.snapshot(), before);
  const result = await f.service.updateCoordination(f.p.id, { expectedRevision: 0, goal: '  可接续的交付  ', criteria: ['  有对应证据  '], order: [] });
  assert.deepEqual(result, { conflict: false, coordination: { revision: 1, goal: '可接续的交付', criteria: ['有对应证据'], order: [t.id] } });
  const reopened = new Projects(await new Store(f.store.path).open(), f.native, {}, limits);
  assert.deepEqual(reopened.readCoordination(f.p.id), result.coordination);
  const restored = reopened.list()[0];
  assert.equal(restored.instructions, before.projects[0].instructions);
  assert.equal(restored.threads[0].id, t.id);
  assert.equal(restored.threads[0].task, before.projects[0].threads[0].task);
  assert.equal(f.deliveries.length, 0);
});

test('invalid revisions, oversized text, duplicate IDs and foreign threads cannot modify coordination', async () => {
  const f = await fixture(), t = await f.add('本项目线程');
  const other = await f.service.create({ title: '其他项目', paths: ['/other-synthetic-repo'] });
  const foreign = await f.service.dispatch(other.lead, { title: '其他线程', task: '其他任务' });
  const valid = { expectedRevision: 0, goal: '目标', criteria: ['有证据'], order: [t.id] };
  const before = f.store.snapshot();
  for (const changes of [
    { expectedRevision: -1 }, { expectedRevision: '0' }, { expectedRevision: Number.MAX_SAFE_INTEGER + 1 },
    { goal: null }, { goal: 'x'.repeat(limits.maxText + 1) }, { criteria: [''] }, { criteria: '无效数组' },
    { order: [t.id, t.id] }, { order: [foreign.id] }, { order: [42] },
  ]) {
    await assert.rejects(f.service.updateCoordination(f.p.id, { ...valid, ...changes }));
    assert.deepEqual(f.store.snapshot(), before);
  }
  await assert.rejects(f.service.updateCoordination('unknown-project', valid), /项目不存在/);
  assert.throws(() => f.service.readCoordination('unknown-project'), /项目不存在/);
  assert.equal(f.deliveries.length, 0);
});

test('simultaneous edits detect a revision conflict inside the durable transaction queue', async () => {
  const f = await fixture();
  const values = await Promise.all(['先提交', '冲突提交'].map(goal => f.service.updateCoordination(f.p.id, { expectedRevision: 0, goal, criteria: [], order: [] })));
  assert.equal(values.filter(value => !value.conflict).length, 1);
  assert.equal(values.filter(value => value.conflict).length, 1);
  assert.deepEqual(values[1], { conflict: true, coordination: values[0].coordination });
  assert.deepEqual(f.service.readCoordination(f.p.id), values[0].coordination);
  assert.equal(f.service.readCoordination(f.p.id).revision, 1);
  assert.equal(f.deliveries.length, 0);
});

test('new threads remain in priority order when an earlier editor saves a partial list', async () => {
  const f = await fixture(), a = await f.add('A');
  const earlier = f.service.readCoordination(f.p.id);
  const b = await f.add('B');
  const value = await f.service.updateCoordination(f.p.id, { ...earlier, expectedRevision: earlier.revision, order: [a.id] });
  assert.deepEqual(value.coordination.order, [a.id, b.id]);
  assert.equal(f.service.list()[0].threads.length, 2);
});

test('priority picks the highest ready task without bypassing dependencies', async () => {
  const f = await fixture({ maxParallel: 1 });
  const a = await f.add('前置 A'), b = await f.add('依赖 B', [a.id]), c = await f.add('独立 C');
  await f.service.updateCoordination(f.p.id, { expectedRevision: 0, goal: '有序交付', criteria: [], order: [b.id, c.id, a.id] });
  await f.begin();
  const running = () => f.service.list()[0].threads.filter(t => t.phase === 'running').map(t => t.id);
  assert.deepEqual(running(), [c.id]);
  await f.finish(c.id); assert.deepEqual(running(), [a.id]);
  await f.finish(a.id); assert.deepEqual(running(), [b.id]);
  assert.deepEqual(f.stops, []);
});

test('editing goals and order preserves running work and only the next natural start adopts the new snapshot', async () => {
  const f = await fixture({ maxParallel: 1 });
  await f.service.updateCoordination(f.p.id, { expectedRevision: 0, goal: '原定目标', criteria: ['原定验收'], order: [] });
  const a = await f.add('A'), b = await f.add('B');
  await f.begin();
  const active = f.service.list()[0].threads.find(t => t.id === a.id);
  assert.deepEqual(active.adoptedCoordination, { revision: 1, goal: '原定目标', criteria: ['原定验收'] });
  const deliveredBefore = f.deliveries.length;
  await f.service.updateCoordination(f.p.id, { expectedRevision: 1, goal: '后续目标', criteria: ['后续验收'], order: [b.id, a.id] });
  await f.drain();
  assert.equal(f.deliveries.length, deliveredBefore);
  assert.deepEqual(f.stops, []);
  const stillActive = f.service.list()[0].threads.find(t => t.id === a.id);
  assert.equal(stillActive.phase, 'running');
  assert.deepEqual(stillActive.adoptedCoordination, active.adoptedCoordination);
  const context = f.service.context(active.sessionId);
  assert.match(context, /本轮仍采用版本 1/);
  assert.match(context, /原定目标/);
  assert.doesNotMatch(context, /后续目标/);
  assert.match(context, /不是新的用户命令或权限授权/);
  await f.finish(a.id);
  const next = f.service.list()[0].threads.find(t => t.id === b.id);
  assert.deepEqual(next.adoptedCoordination, { revision: 2, goal: '后续目标', criteria: ['后续验收'] });
  assert.match(f.deliveries.find(m => m.target === next.sessionId).text, /后续目标/);
  await f.service.dispatch(f.p.lead, { thread_id: a.id, task: '自然继续 A' });
  await f.finish(b.id);
  const continued = f.service.list()[0].threads.find(t => t.id === a.id);
  assert.equal(continued.sessionId, active.sessionId);
  assert.equal(continued.adoptedCoordination.revision, 2);
  assert.equal(f.sessions.size, 3, 'the lead and two workers are reused');
  const persisted = await new Store(f.store.path).open();
  assert.equal(persisted.state.projects[0].threads.find(t => t.id === a.id).adoptedCoordination.revision, 2);
});

test('a worker preparing its session adopts the latest goal atomically with its delivered task', async () => {
  const f = await fixture({ maxParallel: 1 }), a = await f.add('A');
  let entered, release;
  const started = new Promise(resolve => { entered = resolve; });
  const gate = new Promise(resolve => { release = resolve; });
  const create = f.native.create;
  f.native.create = async (...args) => { entered(); await gate; return create(...args); };
  const launching = f.begin();
  await started;
  await f.service.updateCoordination(f.p.id, { expectedRevision: 0, goal: '准备期间确认的目标', criteria: ['对应当前版本'], order: [a.id] });
  release(); await launching;
  const worker = f.service.list()[0].threads[0];
  assert.equal(worker.adoptedCoordination.revision, 1);
  assert.match(f.deliveries[0].text, /准备期间确认的目标/);
  assert.match(f.deliveries[0].text, /本轮采用目标版本 1/);
});

test('UI coordination RPC returns distinguishable conflicts and keeps model tools read-only for goals', async () => {
  const routes = [], definitions = [], cleanups = [], agents = new Map();
  const ctx = {
    agents, tools: { register: value => definitions.push(value), guard() {} },
    effect: setup => cleanups.push(setup()), on() {},
    systemPrompt: { context() {}, getContextOrder: () => 1 },
    connection: { fetch: { register: value => routes.push(value) } },
    workspaceRegistry: { async create() { return { id: 'synthetic-workspace' }; } },
    sessionController: {
      async create() { const id = `api-session-${agents.size}`; agents.set(id, { id, session: {}, status: 'idle' }); return { sessionId: id }; },
      async rename() {},
    },
    permissionPresets: { set() {} }, sandboxPolicy: { resolve: () => ({ mode: 'read-only' }) },
  };
  const cwd = await mkdtemp(join(tmpdir(), 'coordination-api-'));
  await apply(ctx, { dataDir: await mkdtemp(join(tmpdir(), 'coordination-api-data-')) });
  const call = async (endpoint, payload) => {
    const response = await routes.find(route => route.path.endsWith(`/${endpoint}`)).fetch(new Request(`http://localhost/api/project-workbench/${endpoint}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: `rpc-${endpoint}`, method: `project-workbench/${endpoint}`, payload }),
    }));
    return (await response.json()).result;
  };
  try {
    const created = await call('create', { title: '界面维护示例', paths: [cwd] });
    assert.equal(created.ok, true);
    const projectId = created.value.id;
    const input = { projectId, expectedRevision: 0, goal: '可审核交付', criteria: ['有验收依据'], order: [] };
    assert.equal((await call('coordination-update', input)).value.conflict, false);
    const conflict = await call('coordination-update', { ...input, goal: '旧页面覆盖' });
    assert.equal(conflict.ok, true); assert.equal(conflict.value.conflict, true);
    assert.equal(conflict.value.coordination.goal, '可审核交付');
    assert.equal((await call('coordination-read', { projectId })).value.revision, 1);
    assert.equal((await call('coordination-update', { ...input, expectedRevision: '1' })).ok, false);
    const modelTools = definitions.map(tool => tool.name).sort();
    for (const required of ['project_dispatch', 'project_read_thread', 'project_report', 'project_threads']) assert.ok(modelTools.includes(required));
    assert.ok(modelTools.every(name => ['project_dispatch', 'project_read_thread', 'project_report', 'project_threads', 'project_continuity', 'project_delivery'].includes(name)), 'goal writes remain UI-only');
    assert.deepEqual(definitions.find(tool => tool.name === 'project_delivery').parameters.properties, {}, 'delivery model access is read-only and takes no mutation arguments');
    const lead = agents.get(created.value.lead);
    const status = await definitions.find(tool => tool.name === 'project_threads').execute({}, { agent: lead, signal: new AbortController().signal });
    assert.equal(JSON.parse(status.result).coordination.goal, '可审核交付');
  } finally { for (const cleanup of cleanups.reverse()) cleanup?.(); }
});

async function panelFixture(request) {
  let project = { id: 'p', coordination: { revision: 0, goal: '已保存目标', criteria: ['已保存验收'], order: ['a', 'b'] }, threads: [
    { id: 'a', title: 'A', phase: 'queued' }, { id: 'b', title: 'B', phase: 'queued' },
  ] };
  const state = [], dependencies = [];
  let stateIndex = 0, effectIndex = 0, pending = [], changed = false, tree, refreshes = 0;
  const sandbox = {
    labels: { queued: '排队中' },
    h(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity).filter(value => value !== false && value !== null && value !== undefined) }; },
    React: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; changed = true; }];
      },
      useEffect(effect, values) {
        const index = effectIndex++;
        if (!dependencies[index] || values.some((value, at) => !Object.is(value, dependencies[index][at]))) {
          dependencies[index] = values; pending.push(effect);
        }
      },
    },
  };
  const source = await readFile(new URL('../client/coordination.js', import.meta.url), 'utf8');
  vm.runInNewContext(`${source}\nthis.Panel = CoordinationPanel;`, sandbox);
  function render() {
    let passes = 0;
    do {
      if (++passes > 20) throw Error('panel effects did not settle');
      changed = false; stateIndex = 0; effectIndex = 0; pending = [];
      tree = sandbox.Panel({ project, request, onSaved: async () => { refreshes++; } });
      for (const effect of pending) effect();
    } while (changed);
    return tree;
  }
  function all(node = tree) { return typeof node === 'object' ? [node, ...node.children.flatMap(child => all(child))] : []; }
  function find(predicate) { const found = all().find(predicate); assert.ok(found, 'expected UI element exists'); return found; }
  function text(node = tree) { return typeof node === 'object' ? node.children.map(text).join(' ') : String(node); }
  const edit = (label, value) => { find(node => node.props['aria-label'] === label).props.onChange({ target: { value } }); render(); };
  const submit = async () => { await find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); render(); };
  render();
  return { render, find, edit, submit, text, get refreshes() { return refreshes; }, setProject: value => { project = { ...project, ...value }; render(); } };
}

test('coordination panel edits criteria and order, retaining the accepted revision while polling catches up', async () => {
  const calls = [];
  const f = await panelFixture(async (name, payload) => {
    calls.push({ name, payload: JSON.parse(JSON.stringify(payload)) });
    return { conflict: false, coordination: { revision: payload.expectedRevision + 1, goal: payload.goal, criteria: payload.criteria, order: payload.order } };
  });
  f.edit('整体目标', '可继续的项目');
  f.edit('验收条件', '第一项\n\n 第二项 ');
  f.find(node => node.props['aria-label'] === '下移 A').props.onClick(); f.render();
  await f.submit();
  assert.deepEqual(calls[0], { name: 'coordination-update', payload: { projectId: 'p', expectedRevision: 0, goal: '可继续的项目', criteria: ['第一项', '第二项'], order: ['b', 'a'] } });
  assert.equal(f.find(node => node.props['aria-label'] === '整体目标').props.value, '可继续的项目');
  assert.equal(f.find(node => node.props.type === 'submit').props.disabled, true);
  assert.match(f.text(), /已保存/);
  f.edit('整体目标', '下一次编辑'); await f.submit();
  assert.equal(calls[1].payload.expectedRevision, 1, 'an older poll must not reset a successful save revision');
});

test('coordination panel preserves a draft on polling changes and conflict, then loads latest only on explicit action', async () => {
  const latest = { revision: 2, goal: '另一处的目标', criteria: ['另一处的验收'], order: ['b', 'a'] };
  const calls = [];
  const f = await panelFixture(async (_name, payload) => { calls.push(payload); return { conflict: true, coordination: latest }; });
  f.edit('整体目标', '我的未保存草稿');
  f.setProject({ coordination: latest });
  assert.equal(f.find(node => node.props['aria-label'] === '整体目标').props.value, '我的未保存草稿');
  await f.submit();
  assert.equal(calls[0].expectedRevision, 0);
  assert.equal(f.find(node => node.props['aria-label'] === '整体目标').props.value, '我的未保存草稿');
  assert.match(f.text(f.find(node => node.props.role === 'alert')), /本次未保存/);
  assert.equal(f.find(node => node.props.type === 'submit').props.disabled, false);
  f.find(node => node.type === 'button' && f.text(node).includes('替换草稿')).props.onClick(); f.render();
  assert.equal(f.find(node => node.props['aria-label'] === '整体目标').props.value, '另一处的目标');
  assert.equal(f.find(node => node.props.type === 'submit').props.disabled, true);
});

test('coordination panel reports a failed save and keeps unsaved edits available', async () => {
  const f = await panelFixture(async () => { throw Error('模拟持久化失败'); });
  f.edit('整体目标', '仍需保存的目标'); await f.submit();
  assert.equal(f.find(node => node.props['aria-label'] === '整体目标').props.value, '仍需保存的目标');
  assert.match(f.text(f.find(node => node.props.role === 'alert')), /模拟持久化失败/);
  assert.equal(f.find(node => node.props.type === 'submit').props.disabled, false);
  assert.equal(f.refreshes, 0);
});
