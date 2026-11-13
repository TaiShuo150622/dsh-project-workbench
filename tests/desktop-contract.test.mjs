import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import Ajv from 'ajv';
import { apply } from '../index.js';
import { Native } from '../server/native.js';

test('registered tools use provider-valid JSON Schema and reject missing/foreign arguments', async () => {
  const definitions = [], endpoints = [], cleanups = [], guards = [];
  const ctx = {
    agents: new Map(),
    tools: { register: t => definitions.push(t), guard: fn => guards.push(fn) },
    effect: setup => cleanups.push(setup()), on() {},
    systemPrompt: { context() {}, getContextOrder: () => 1 },
    connection: { fetch: { register: route => endpoints.push(route) } },
  };
  await apply(ctx, { dataDir: await mkdtemp(join(tmpdir(), 'project-schema-')) });
  const ajv = new Ajv({ strict: true });
  for (const tool of definitions) {
    assert.equal(ajv.validateSchema(tool.parameters), true, ajv.errorsText());
    assert.equal(ajv.validateSchema(tool.output.schema), true, ajv.errorsText());
    ajv.compile(tool.parameters); ajv.compile(tool.output.schema);
  }
  const dispatch = definitions.find(d => d.name === 'project_dispatch');
  const valid = ajv.compile(dispatch.parameters);
  assert.equal(valid({ task: 'Continue', thread_id: 'known-thread' }), true);
  assert.equal(valid({ title: 'Missing task' }), false);
  assert.equal(valid({ task: 'Foreign project', projectId: 'other' }), false);
  assert.equal(valid({ task: 'Invalid mode', mode: 'unsafe' }), false);
  const actor = { id: 'unregistered' };
  await assert.rejects(dispatch.execute({ task: 'Impersonation' }, { agent: actor, signal: new AbortController().signal }), /真实/);
  assert.equal(guards[0]({ agent: actor, name: 'send_message' }), undefined, 'unrelated native sessions retain their tools');
  const cwd = await mkdtemp(join(tmpdir(), 'project-guard-'));
  const lead = { id: 'project-lead', session: {}, status: 'idle' }; ctx.agents.set(lead.id, lead);
  ctx.workspaceRegistry = { async create() { return { id: 'workspace' }; } };
  ctx.sessionController = { async create() { return { sessionId: lead.id }; }, async rename() {} };
  ctx.permissionPresets = { set() {} }; ctx.sandboxPolicy = { resolve: () => ({ mode: 'read-only' }) };
  const response = await endpoints.find(r => r.path.endsWith('/create')).fetch(new Request('http://localhost/api/project-workbench/create', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: 'create-test', method: 'project-workbench/create', payload: { title: 'Guard test', paths: [cwd] } }),
  }));
  assert.equal((await response.json()).result.ok, true);
  assert.match(guards[0]({ agent: lead, name: 'subagent_claude_code' }), /当前项目/);
  assert.match(guards[0]({ agent: lead, name: 'send_message' }), /当前项目/);
  assert.equal(guards[0]({ agent: lead, name: 'project_dispatch' }), undefined);
  assert.equal(guards[0]({ agent: lead, name: 'read' }), undefined);
  assert.deepEqual(endpoints.map(route => route.path.split('/').at(-1)).sort(),
    ['list', 'create', 'join', 'action', 'diff', 'health', 'coordination-read', 'coordination-update', 'continuity', 'continuity-decision', 'continuity-handoff', 'continuity-takeover', 'continuity-begin', 'recovery-check', 'delivery-read', 'delivery-update'].sort());
  for (const cleanup of cleanups.reverse()) cleanup?.();
});

test('native desktop sessions are created through Workspace membership and keep sandbox bounds', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'project-native-'));
  const calls = [], agent = { session: {} };
  let mode;
  const native = new Native({
    workspaceRegistry: { async create(path) { calls.push(['workspace', path]); return { id: 'w', async attachSession(id) { calls.push(['attach', id]); } }; } },
    sessionController: { async create(args) { calls.push(['create', args]); return { sessionId: 's' }; }, async rename(args) { calls.push(['rename', args]); }, async inspect() { return { meta: { cwd } }; } },
    agents: new Map([['s', agent]]),
    permissionPresets: { set(_session, preset) { mode = preset; } },
    sandboxPolicy: { resolve() { return { mode, workspaceRoot: cwd }; } },
  });
  assert.equal(await native.create(cwd, 'Code', 'code'), 's');
  assert.deepEqual(calls[1], ['create', { workspaceId: 'w' }]);
  assert.equal(mode, 'workspace-write');
  await native.ensureWorkspace('s');
  assert.deepEqual(calls.at(-1), ['attach', 's']);
  native.ctx.sandboxPolicy.resolve = () => ({ mode: 'danger-full-access', workspaceRoot: cwd });
  await assert.rejects(native.create(cwd, 'Unsafe', 'code'), /写入边界/);
});

function clientFixture(existing = false) {
  const registered = new Map(), declarations = new Set(['sidebar.panellist','main','conversation.session.header.actions','sidebar.right.pane.tab']);
  const cleanups = [], types = new Map(existing ? [['project-workbench', { id: 'dsh-project-workbench/threads' }]] : []);
  const effect = setup => {
    const result = setup();
    const disposers = typeof result === 'function' ? [result] : [...(result || [])];
    const dispose = () => { for (const fn of disposers.reverse()) fn?.(); };
    cleanups.push(dispose); return dispose;
  };
  const ctx = {
    connection: { rpc: {} }, effect,
    inject(_deps, setup) { setup(ctx); },
    sidebarRight: {},
    sidebarRightTabs: { get: kind => types.get(kind), register(type) { if (types.has(type.kind)) throw Error('duplicate'); types.set(type.kind, type); return () => types.delete(type.kind); } },
    slots: {
      inject(name, setup) { assert.ok(declarations.has(name)); return effect(setup); },
      register(options, Component) {
        assert.ok(declarations.has(options.name));
        for (const name of Object.keys(options.children || {})) { assert.ok(!declarations.has(name)); declarations.add(name); }
        const key = options.key || options.id || options.name;
        registered.set(key, { options, Component });
        return () => { registered.delete(key); for (const name of Object.keys(options.children || {})) declarations.delete(name); };
      },
    },
  };
  return { ctx, registered, types, cleanup: () => { for (const fn of cleanups.reverse()) fn(); } };
}
async function clientSource() {
  return (await Promise.all(['coordination.js', 'continuity.js', 'recovery.js', 'graph.js', 'delivery.js', 'app.js'].map(path => readFile(new URL(`../client/${path}`, import.meta.url), 'utf8')))).join('\n');
}
test('client owns its embedded slot, registers the native tab body, and cleans up on hot reload', async () => {
  const source = await clientSource();
  const sandbox = { React: { useState(){}, useEffect(){}, useRef(){} }, LIMITS: { panelOrder: 31 }, BUILD: 'test' };
  vm.runInNewContext(source + '\nthis.pluginApply=apply;', sandbox);
  for (const existing of [false, true]) {
    const f = clientFixture(existing); sandbox.pluginApply(f.ctx);
    assert.ok(f.registered.has('dsh-project-workbench/threads'));
    assert.ok(f.registered.has('project-workbench.conversation'));
    assert.ok(f.types.has('project-workbench'));
    f.cleanup();
    assert.equal(f.registered.size, 0);
    assert.equal(f.types.size, existing ? 1 : 0);
  }
});
test('project navigation waits for the mounted desktop header before opening its thread pane', async () => {
  const source = await clientSource();
  const p = { id: 'project', lead: 'lead', threads: [] }, effects = [], opened = [];
  let mounted;
  const f = clientFixture();
  f.ctx.get = () => ({ openSession: id => opened.push(['navigate', id]) });
  Object.assign(f.ctx.sidebarRight, {
    mounted: { getSnapshot: () => mounted }, openTabs: { getSnapshot: () => [] },
    openTab(kind, options) { if (!mounted) throw Error('not mounted'); opened.push(['pane', kind, options.params.projectId]); },
  });
  const sandbox = { React: {
    useState: () => [{ projects: [p] }], useRef: () => ({ current: null }), useEffect: effect => effects.push(effect),
  }, h: () => null, LIMITS: { panelOrder: 31 }, BUILD: 'test' };
  vm.runInNewContext(source + '\nthis.pluginApply=apply; this.navigate=openProject; this.header=Header;', sandbox);
  sandbox.pluginApply(f.ctx); sandbox.navigate(p); sandbox.header({ sessionId: p.lead }); effects.at(-1)();
  assert.deepEqual(opened, [['navigate', 'lead']], 'navigation must not open against a stale/unmounted surface');
  mounted = 'lead'; sandbox.header({ sessionId: p.lead }); effects.at(-1)();
  assert.deepEqual(opened[1], ['pane', 'project-workbench', 'project']);
  sandbox.header({ sessionId: p.lead }); effects.at(-1)();
  assert.equal(opened.length, 2, 'metadata polling must not reopen the tab repeatedly');
  f.cleanup();
});

test('a blank project can open management from the project page before sending any model message', async () => {
  const source = await clientSource(), states = [];
  let cursor = 0;
  const p = { id: 'blank-project', title: '尚未开始的项目', lead: 'blank-lead', repos: [{ path: '/synthetic-repo' }], threads: [], coordination: { revision: 0, goal: '', criteria: [], order: [] } };
  const sandbox = {
    React: {
      useState(initial) { const slot = cursor++; if (!(slot in states)) states[slot] = typeof initial === 'function' ? initial() : initial; return [states[slot], value => { states[slot] = value; }]; },
      useEffect() {}, useRef() {},
    },
    h: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(value => value !== false && value !== null && value !== undefined) }),
    LIMITS: { panelOrder: 31 }, BUILD: 'test', project: p,
  };
  vm.runInNewContext(source + '\nuseProjects = () => [{projects: [project], loading: false}, async () => {}]; this.page = ProjectPage; this.Coordination = CoordinationPanel;', sandbox);
  const render = () => { cursor = 0; return sandbox.page({}); };
  const nodes = tree => typeof tree === 'object' ? [tree, ...tree.children.flatMap(nodes)] : [];
  const initial = render();
  const manage = nodes(initial).find(node => node.type === 'button' && node.children.includes('管理项目'));
  assert.ok(manage, 'management is available independently of the blank conversation header');
  manage.props.onClick();
  const management = nodes(render()).find(node => node.type === sandbox.Coordination);
  assert.ok(management, 'the project page renders the editor directly');
  assert.equal(management.props.project, p);
  assert.equal(typeof management.props.request, 'function');
});
