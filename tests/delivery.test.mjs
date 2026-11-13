import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { Store } from '../server/store.js';
import { Delivery } from '../server/delivery.js';
import { Coordination } from '../server/coordination.js';
import { continuityPackage } from '../server/continuity.js';

const registered = JSON.parse(await readFile(new URL('../config/hyperparams.yaml', import.meta.url), 'utf8'));
const limits = Object.fromEntries(Object.entries(registered).map(([k, v]) => [k, v.value]));
async function fixture(initialize = true) {
  const dir = await mkdtemp(join(tmpdir(), 'delivery-test-')), store = await new Store(join(dir, 'projects.json')).open();
  await store.change(s => { s.projects.push({ id: 'one', title: '合成项目', lead: 'lead', repos: [],
    coordination: { revision: 1, goal: '共同交付说明', criteria: ['包含约束和核对步骤'], order: ['a', 'b'] },
    threads: ['a', 'b'].map(id => ({ id, title: id, sessionId: `session-${id}`, phase: 'review', generation: 1, reportedGeneration: 1,
      summary: `${id} 原汇报`, task: '只读研究', dependsOn: [], nodes: ['legacy-node'] })) }); });
  const native = { runtimeState: () => 'idle', coordinatorState: () => ({ state: 'idle' }), create() { throw Error('不允许创建任务'); } };
  const service = new Delivery(store, native, limits), coord = new Coordination(store, limits);
  const read = () => service.read('one');
  const change = (action, data = {}) => { const current = read(); return service.update({ projectId: 'one', expectedRevision: current.revision, sourceToken: current.sourceToken, action, data }); };
  if (initialize) await change('initialize');
  const addWork = async (title, extra = {}) => {
    const result = await change('package-save', { title, input: '已给定的原文', output: '可核对的说明', done: '区分原文和建议',
      criterionIds: [read().criteria.find(c => c.active).id], threadIds: ['a'], dependsOn: [], decisionIds: [], ...extra });
    return result.objectId;
  };
  const addArtifact = async (workId, title = '成果') => (await change('artifact-save', { workId, threadId: 'a', title,
    summary: '汇报内容', reference: 'session:session-a', evidence: '已逐项对照合成输入，未代替用户内容验收' })).objectId;
  const accept = (artifactIds, extra = {}) => change('acceptance', { criterionId: read().criteria.find(c => c.active).id,
    artifactIds, decision: 'accept', confirmed: true, note: '合成验收：逐项核对所选版本', ...extra });
  return { store, service, coord, read, change, addWork, addArtifact, accept, native };
}

test('delivery legacy reads are pure and explicit initialization persists stable criterion identities', async () => {
  const f = await fixture(false), before = f.store.snapshot();
  assert.equal(f.read().initialized, false); assert.deepEqual(f.read().graph, f.read().graph);
  assert.deepEqual(f.store.snapshot(), before);
  await f.change('initialize'); const view = f.read();
  assert.equal(view.criteria[0].text, '包含约束和核对步骤');
  assert.notEqual(view.criteria[0].id, '0');
  const reopened = new Delivery(await new Store(f.store.path).open(), f.native, limits);
  assert.deepEqual(reopened.read('one'), view);
  assert.deepEqual(f.store.snapshot().projects[0].threads, before.projects[0].threads);
});

test('delivery end to end requires final artifact coverage and explicit acceptance while preserving original threads', async () => {
  const f = await fixture(), original = f.store.snapshot().projects[0].threads;
  const input = await f.addWork('输入'), steps = await f.addWork('步骤');
  const final = await f.addWork('最终说明', { dependsOn: [input, steps] });
  const a = await f.addArtifact(input), b = await f.addArtifact(steps);
  assert.equal(f.read().summary.complete, false);
  assert.ok(f.read().gaps.some(g => g.workId === final && g.kind === 'missing-artifact'));
  await assert.rejects(f.accept([a, b]), /尚未覆盖/);
  const c = await f.addArtifact(final);
  assert.equal(f.read().summary.complete, false);
  await f.accept([a, b, c]);
  assert.equal(f.read().summary.complete, true);
  assert.deepEqual(f.store.snapshot().projects[0].threads, original);
  const graph = f.read().graph, allIds = new Set(graph.nodes.map(n => n.id));
  assert.equal(allIds.size, graph.nodes.length);
  assert.ok(graph.edges.every(e => allIds.has(e.from) && allIds.has(e.to)));
  assert.equal(graph.nodes.find(n => n.objectId === 'a').sessionId, 'session-a');
});

test('delivery rejects foreign references and cyclic dependencies without saving partial mutations', async () => {
  const f = await fixture(), a = await f.addWork('A'), b = await f.addWork('B', { dependsOn: [a] });
  const before = f.store.snapshot();
  for (const patch of [{ threadIds: ['foreign'] }, { criterionIds: ['foreign'] }, { decisionIds: ['foreign'] }, { dependsOn: ['foreign'] }, { dependsOn: [b] }]) {
    const w = f.read().packages.find(w => w.id === a);
    await assert.rejects(f.change('package-save', { ...w, ...patch }), /不属于|形成环/);
    assert.deepEqual(f.store.snapshot(), before);
  }
  await assert.rejects(f.change('artifact-save', { workId: a, threadId: 'b' }), /未关联/);
});

test('delivery version check rejects concurrent edits and stale acceptance bases', async () => {
  const f = await fixture(), view = f.read();
  const request = { projectId: 'one', expectedRevision: view.revision, sourceToken: view.sourceToken, action: 'criterion-save', data: { text: '新条件' } };
  const results = await Promise.allSettled([f.service.update(request), f.service.update(request)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(f.read().criteria.filter(c => c.text === '新条件').length, 1);
  const stale = f.read();
  await f.coord.update('one', { expectedRevision: 2, goal: '修改目标', criteria: f.coord.read('one').criteria, order: ['a', 'b'] });
  const before = f.store.snapshot();
  await assert.rejects(f.service.update({ ...request, expectedRevision: stale.revision, sourceToken: stale.sourceToken }), /依据已更新/);
  assert.deepEqual(f.store.snapshot(), before);
});

test('delivery ordering changes preserve applicability and criterion identity', async () => {
  const f = await fixture(), work = await f.addWork('A'), a = await f.addArtifact(work);
  await f.accept([a]); const before = f.read();
  await f.coord.update('one', { expectedRevision: 1, goal: '共同交付说明', criteria: ['包含约束和核对步骤'], order: ['b', 'a'] });
  const after = f.read();
  assert.equal(after.summary.complete, true); assert.equal(after.artifacts[0].stale, false);
  assert.equal(after.criteria[0].id, before.criteria[0].id);
  assert.notEqual(after.sourceToken, before.sourceToken);
});

test('delivery changed contracts invalidate downstream evidence but retain independent results and history', async () => {
  const f = await fixture(), up = await f.addWork('上游'), down = await f.addWork('下游', { dependsOn: [up] }), independent = await f.addWork('独立');
  const a = await f.addArtifact(up), b = await f.addArtifact(down), c = await f.addArtifact(independent);
  await f.accept([a, b, c]);
  await f.change('package-save', { ...f.read().packages.find(w => w.id === up), input: '修改输入约定' });
  let view = f.read();
  assert.equal(view.artifacts.find(x => x.id === a).stale, true);
  assert.equal(view.artifacts.find(x => x.id === b).stale, true);
  assert.equal(view.artifacts.find(x => x.id === c).stale, false);
  assert.equal(view.summary.complete, false); assert.equal(view.acceptances.length, 1);
  await f.change('artifact-review', { id: a, decision: 'reuse', note: '逐项核对后沿用' });
  assert.equal(f.read().artifacts.find(x => x.id === b).stale, true);
  await f.change('artifact-review', { id: b, decision: 'reuse', note: '核对上游新版本后沿用' });
  view = f.read(); assert.equal(view.artifacts.find(x => x.id === b).stale, false);
  assert.equal(view.summary.complete, false);
  assert.equal(view.artifacts.find(x => x.id === b).history[0].version, 1);
  await f.accept([a, b, c]); assert.equal(f.read().summary.complete, true);
});

test('delivery incomplete upstream artifacts cannot be accepted through a downstream-only condition', async () => {
  const f = await fixture(), up = await f.addWork('上游', { criterionIds: [] }), down = await f.addWork('下游', { dependsOn: [up] });
  const a = await f.addArtifact(down);
  assert.equal(f.read().artifacts[0].stale, true);
  await assert.rejects(f.accept([a]), /不适用|需要复核/);
  await f.addArtifact(up);
  assert.equal(f.read().artifacts.find(x => x.id === a).stale, true);
  await f.change('artifact-review', { id: a, decision: 'reuse', note: '核对已补充的上游成果' });
  await f.accept([a]); assert.equal(f.read().summary.complete, true);
});

test('delivery criterion edits keep stable identity and require fresh acceptance', async () => {
  const f = await fixture(), w = await f.addWork('A'), a = await f.addArtifact(w);
  await f.accept([a]); const c = f.read().criteria[0];
  await f.change('criterion-save', { id: c.id, text: '新条件要求' });
  assert.equal(f.read().criteria[0].id, c.id); assert.equal(f.read().criteria[0].version, 2);
  assert.equal(f.coord.read('one').criteria[0], '新条件要求');
  assert.equal(f.read().artifacts[0].stale, true);
  assert.equal(f.read().criteria[0].history[0].text, c.text);
  assert.equal(f.read().summary.complete, false);
});

test('delivery legacy replacement retires unmatched criteria instead of silently moving acceptance', async () => {
  const f = await fixture(), w = await f.addWork('A'), a = await f.addArtifact(w); await f.accept([a]);
  const id = f.read().criteria[0].id;
  await f.coord.update('one', { expectedRevision: 1, goal: '共同交付说明', criteria: ['替换的条件'], order: ['a', 'b'] });
  const view = f.read();
  assert.equal(view.criteria.find(c => c.id === id).active, false);
  assert.equal(view.criteria.find(c => c.active).status, 'pending');
  assert.equal(view.summary.complete, false);
});

test('delivery reported evidence changes and decision replacement invalidate saved applicability', async () => {
  const f = await fixture();
  await f.store.change(s => { s.projects[0].continuity = { revision: 1, decisions: [{ id: 'd', text: '有效决定', status: 'active' }], handoffs: [], previousLeads: [] }; });
  const w = await f.addWork('A', { decisionIds: ['d'] }), a = await f.addArtifact(w); await f.accept([a]);
  const original = f.read();
  await f.store.change(s => { s.projects[0].threads[0].summary = '新汇报'; });
  assert.equal(f.read().artifacts[0].stale, true);
  await assert.rejects(f.service.update({ projectId: 'one', action: 'artifact-review', expectedRevision: original.revision, sourceToken: original.sourceToken, data: { id: a, decision: 'reuse', note: '过期依据' } }), /依据已更新/);
  await f.change('artifact-review', { id: a, decision: 'reuse', note: '已核对新汇报' });
  await f.store.change(s => { s.projects[0].continuity.decisions[0].status = 'superseded'; });
  assert.equal(f.read().artifacts[0].stale, true);
});

test('delivery manual acceptance requires confirmation and retains rejection records', async () => {
  const f = await fixture(), w = await f.addWork('A'), a = await f.addArtifact(w);
  await assert.rejects(f.accept([a], { confirmed: false }), /明确确认/);
  await assert.rejects(f.accept([a], { note: '' }), /验收依据/);
  await f.accept([a]); await f.accept([a], { decision: 'reject', note: '发现缺项，退回补充' });
  assert.equal(f.read().criteria[0].status, 'rejected'); assert.equal(f.read().acceptances.length, 2);
  await f.change('artifact-review', { id: a, decision: 'revise', note: '补充缺项' });
  assert.equal(f.read().artifacts[0].stale, true);
});

test('delivery handoff captures immutable records and versioned graph references without task creation', async () => {
  const f = await fixture(), w = await f.addWork('A'), a = await f.addArtifact(w);
  const before = f.store.snapshot();
  const saved = continuityPackage(f.store.state.projects[0], f.native, '核对成果');
  assert.deepEqual(f.store.snapshot(), before);
  assert.equal(saved.delivery.sourceToken, f.read().graph.sourceToken);
  assert.deepEqual(saved.threads[0].nodes, ['legacy-node']);
  await f.change('artifact-review', { id: a, decision: 'revise', note: '需补充' });
  assert.equal(saved.delivery.artifacts[0].version, 1);
  assert.notEqual(saved.delivery.sourceToken, f.read().sourceToken);
});

test('delivery graph downstream focus excludes unrelated branches and execution-only prerequisites', async () => {
  const f = await fixture(), a = await f.addWork('A'), b = await f.addWork('B', { dependsOn: [a] }), c = await f.addWork('C');
  const context = vm.createContext({});
  vm.runInContext(await readFile(new URL('../client/graph.js', import.meta.url), 'utf8'), context);
  const found = context.graphImpact(f.read().graph, `one/package/${a}`);
  assert.equal(found.has(`one/package/${b}`), true);
  assert.equal(found.has(`one/package/${c}`), false);
  const layout = context.graphPositions(f.read().graph);
  assert.equal(layout.positions.size, f.read().graph.nodes.length);
});
