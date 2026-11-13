import { createHash, randomUUID } from 'node:crypto';
import { projectGraph } from './graph.js';

const stamp = () => new Date().toISOString();
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fresh = () => ({ version: 1, revision: 0, criteria: [], packages: [], artifacts: [], acceptances: [], events: [] });
const copy = value => structuredClone(value);
export function deliveryOf(p) {
  if (p.delivery === undefined) return fresh();
  const d = p.delivery;
  if (!d || d.version !== 1 || !Number.isSafeInteger(d.revision) || d.revision < 0
    || ['criteria', 'packages', 'artifacts', 'acceptances', 'events'].some(k => !Array.isArray(d[k])))
    throw Error('交付记录格式不支持，请保留原记录后检查');
  return d;
}
function byId(items, id, label) {
  const value = items.find(x => x.id === id);
  if (!value) throw Error(`${label}不属于此项目或不存在`);
  return value;
}
function text(v, limits, label, optional = false) {
  if (optional && (v === undefined || v === '')) return '';
  if (typeof v !== 'string' || !v.trim() || v.length > limits.maxText) throw Error(`${label}为空或过长`);
  return v.trim();
}
function ids(value, items, label) {
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string')) throw Error(`${label}必须为 ID 数组`);
  const unique = [...new Set(value)];
  unique.forEach(id => byId(items, id, label));
  return unique;
}
function revise(item, changes) {
  const { history = [], ...before } = item;
  if (!Number.isSafeInteger(item.version) || item.version >= Number.MAX_SAFE_INTEGER) throw Error('对象版本已达上限');
  Object.assign(item, changes, { version: item.version + 1, updatedAt: stamp(), history: [...history, before] });
}
function created(fields) { return { id: randomUUID(), version: 1, ...fields, updatedAt: stamp(), history: [] }; }
function criterion(text) { return created({ text, active: true }); }
function event(d, action, id) {
  if (d.revision >= Number.MAX_SAFE_INTEGER) throw Error('交付版本已达上限');
  d.revision++;
  d.events.push({ id: randomUUID(), revision: d.revision, action, objectId: id, source: 'user-panel', at: stamp() });
}

/** Legacy text edits preserve exact matches; ambiguous replacements become new identities. */
export function syncDeliveryCriteria(p, previous, next) {
  if (!p.delivery || JSON.stringify(previous.criteria) === JSON.stringify(next.criteria)) return;
  const d = deliveryOf(p), available = d.criteria.filter(c => c.active), used = new Set(), ordered = [];
  for (const value of next.criteria) {
    const matched = available.find(c => !used.has(c.id) && c.text === value);
    if (matched) { used.add(matched.id); ordered.push(matched); }
    else ordered.push(criterion(value));
  }
  for (const c of available) if (!used.has(c.id)) revise(c, { active: false });
  d.criteria = [...ordered, ...d.criteria.filter(c => !c.active)];
  event(d, 'criteria-sync', p.id);
}
function acyclic(packages) {
  const active = new Set(), done = new Set();
  const visit = id => {
    if (active.has(id)) throw Error('交付依赖形成环，请移除循环依赖');
    if (done.has(id)) return;
    const w = byId(packages, id, '工作包'); active.add(id);
    w.dependsOn.forEach(visit); active.delete(id); done.add(id);
  };
  packages.forEach(w => visit(w.id));
}
function threadEvidence(t) { return [t.id, t.generation ?? 0, t.reportedGeneration ?? null, t.summary || '']; }
export function deliveryToken(p) {
  return digest([p.id, deliveryOf(p), p.coordination || null,
    (p.continuity?.decisions || []).map(d => [d.id, d.status, d.supersededBy || null, d.text]),
    p.threads.map(threadEvidence)]);
}
/** Only declared relations affect applicability. Ordering and runtime observations are excluded. */
export function workBasis(p, workId) {
  const d = deliveryOf(p), visited = new Set();
  const walk = id => {
    if (visited.has(id)) return;
    visited.add(id); byId(d.packages, id, '工作包').dependsOn.forEach(walk);
  };
  walk(workId);
  const contracts = [...visited].sort().map(id => {
    const w = byId(d.packages, id, '工作包');
    return { id, version: w.version,
      criteria: w.criterionIds.map(id => { const c = byId(d.criteria, id, '验收条件'); return [id, c.version, c.active]; }),
      decisions: w.decisionIds.map(id => { const x = byId(p.continuity?.decisions || [], id, '决定'); return [id, x.status, x.supersededBy || null]; }),
      threads: w.threadIds.map(id => threadEvidence(byId(p.threads, id, '线程'))) };
  });
  const upstream = d.artifacts.filter(a => a.workId !== workId && visited.has(a.workId)).map(a => [a.id, a.version]);
  return digest({ goal: p.coordination?.goal || '', contracts, upstream });
}
function artifactCurrent(p, artifact) {
  const d = deliveryOf(p), w = byId(d.packages, artifact.workId, '工作包');
  return !artifact.needsRevision && artifact.basis === workBasis(p, artifact.workId)
    && w.dependsOn.every(id => d.artifacts.some(a => a.workId === id && artifactCurrent(p, a)));
}
function acceptanceBasis(p, c, artifactIds) {
  const d = deliveryOf(p);
  return digest({ criterion: [c.id, c.version, c.active],
    packages: d.packages.filter(w => w.criterionIds.includes(c.id)).map(w => [w.id, workBasis(p, w.id)]),
    artifacts: artifactIds.map(id => { const a = byId(d.artifacts, id, '成果'); return [a.id, a.version, a.basis, a.needsRevision]; }) });
}
export function deliveryView(p) {
  const d = deliveryOf(p);
  const artifacts = d.artifacts.map(a => ({ ...copy(a), stale: !artifactCurrent(p, a),
    reviewReason: a.needsRevision ? '已决定补充或返工，等待新成果' : artifactCurrent(p, a) ? '' : '目标、约定、相关决定、上游成果或线程汇报已变化' }));
  const criteria = d.criteria.map(c => {
    const required = d.packages.filter(w => w.criterionIds.includes(c.id));
    const missing = required.filter(w => !artifacts.some(a => a.workId === w.id && !a.stale));
    const last = d.acceptances.filter(a => a.criterionId === c.id).at(-1);
    const accepted = c.active && required.length > 0 && !missing.length && last?.decision === 'accept'
      && last.basis === acceptanceBasis(p, c, last.artifactIds);
    const status = !c.active ? 'retired' : accepted ? 'accepted' : last?.decision === 'reject' ? 'rejected'
      : last ? 'recheck' : 'pending';
    return { ...copy(c), status, requiredWorkIds: required.map(w => w.id), missingWorkIds: missing.map(w => w.id),
      eligible: c.active && required.length > 0 && !missing.length, lastAcceptance: copy(last || null) };
  });
  const gaps = [];
  for (const c of criteria.filter(c => c.active)) {
    if (!c.requiredWorkIds.length) gaps.push({ kind: 'unassigned', criterionId: c.id, text: `尚未安排模块：${c.text}` });
    for (const id of c.missingWorkIds) gaps.push({ kind: 'missing-artifact', criterionId: c.id, workId: id, text: `缺少适用成果：${byId(d.packages, id, '工作包').title}` });
    if (c.status !== 'accepted') gaps.push({ kind: 'acceptance', criterionId: c.id, text: `尚未通过当前版本验收：${c.text}` });
  }
  for (const w of d.packages) {
    if (!w.criterionIds.some(id => criteria.some(c => c.id === id && c.active))) gaps.push({ kind: 'unaligned', workId: w.id, text: `尚未关联当前验收条件：${w.title}` });
    if (!w.threadIds.length) gaps.push({ kind: 'unassigned-thread', workId: w.id, text: `尚未关联工作线程：${w.title}` });
  }
  const active = criteria.filter(c => c.active);
  return { projectId: p.id, initialized: !!p.delivery, revision: d.revision, sourceToken: deliveryToken(p),
    goal: p.coordination?.goal || '', goalRevision: p.coordination?.revision || 0,
    criteria, packages: copy(d.packages), artifacts, acceptances: copy(d.acceptances), gaps,
    summary: { criteria: active.length, accepted: active.filter(c => c.status === 'accepted').length,
      recheck: artifacts.filter(a => a.stale).length, gaps: gaps.length,
      complete: active.length > 0 && active.every(c => c.status === 'accepted') },
    events: copy(d.events) };
}

export class Delivery {
  constructor(store, native, limits) { Object.assign(this, { store, native, limits }); }
  project(state, id) { return byId(state.projects, id, '项目'); }
  read(projectId) {
    const p = this.project(this.store.state, projectId), view = deliveryView(p);
    return { ...view, graph: projectGraph(p, view, this.native) };
  }
  async update(args) {
    return this.store.change(state => {
      const p = this.project(state, args.projectId), d = deliveryOf(p);
      if (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision !== d.revision || args.sourceToken !== deliveryToken(p))
        throw Error('交付依据已更新，请刷新后重新核对；本次未保存');
      if (args.action !== 'initialize' && !p.delivery) throw Error('请先启用交付管理');
      const data = args.data || {};
      const bound = collection => { if (collection.length >= this.limits.maxDeliveryItems) throw Error('交付记录数量已达上限'); };
      let changedId = p.id;
      if (args.action === 'initialize') {
        if (p.delivery) throw Error('交付管理已启用');
        d.criteria = (p.coordination?.criteria || []).map(criterion); p.delivery = d;
      } else if (args.action === 'criterion-save') {
        const value = text(data.text, this.limits, '验收条件');
        if (data.id) {
          const c = byId(d.criteria, data.id, '验收条件');
          if (!c.active) throw Error('已归档条件不能直接改写');
          revise(c, { text: value }); changedId = c.id;
        } else { bound(d.criteria); const c = criterion(value); d.criteria.push(c); changedId = c.id; }
        p.coordination ||= { revision: 0, goal: '', criteria: [], order: [] };
        p.coordination.criteria = d.criteria.filter(c => c.active).map(c => c.text); p.coordination.revision++;
      } else if (args.action === 'criterion-retire') {
        const c = byId(d.criteria, data.id, '验收条件'); revise(c, { active: false }); changedId = c.id;
        p.coordination.criteria = d.criteria.filter(c => c.active).map(c => c.text); p.coordination.revision++;
      } else if (args.action === 'package-save') {
        const value = { title: text(data.title, this.limits, '工作包名称'), input: text(data.input, this.limits, '输入约定'),
          output: text(data.output, this.limits, '输出约定'), done: text(data.done, this.limits, '完成要求'),
          owner: text(data.owner, this.limits, '负责人说明', true),
          criterionIds: ids(data.criterionIds || [], d.criteria.filter(c => c.active), '验收条件'),
          threadIds: ids(data.threadIds || [], p.threads, '线程'), dependsOn: ids(data.dependsOn || [], d.packages, '上游工作包'),
          decisionIds: ids(data.decisionIds || [], (p.continuity?.decisions || []).filter(x => x.status === 'active'), '有效决定') };
        if (data.id) { const w = byId(d.packages, data.id, '工作包'); revise(w, value); changedId = w.id; }
        else { bound(d.packages); const w = created(value); d.packages.push(w); changedId = w.id; }
        acyclic(d.packages);
      } else if (args.action === 'artifact-save') {
        const w = byId(d.packages, data.workId, '工作包');
        if (data.threadId && !w.threadIds.includes(data.threadId)) throw Error('成果线程未关联此工作包');
        const value = { workId: w.id, threadId: data.threadId || '', title: text(data.title, this.limits, '成果名称'),
          summary: text(data.summary, this.limits, '成果说明'), reference: text(data.reference, this.limits, '成果位置'),
          evidence: text(data.evidence, this.limits, '核对证据'), basis: workBasis(p, w.id), needsRevision: false,
          source: 'user-registered', sourceNote: '引用和证据由用户登记，系统未自动验证文件内容。' };
        if (data.id) { const a = byId(d.artifacts, data.id, '成果'); if (a.workId !== w.id) throw Error('不能把历史成果移到其他工作包'); revise(a, value); changedId = a.id; }
        else { bound(d.artifacts); const a = created(value); d.artifacts.push(a); changedId = a.id; }
      } else if (args.action === 'artifact-review') {
        const a = byId(d.artifacts, data.id, '成果'), note = text(data.note, this.limits, '复核依据');
        if (!['reuse', 'revise'].includes(data.decision)) throw Error('复核结论必须是沿用或补充返工');
        revise(a, { basis: workBasis(p, a.workId), needsRevision: data.decision === 'revise',
          review: { decision: data.decision, note, at: stamp(), source: 'user-panel' } }); changedId = a.id;
      } else if (args.action === 'acceptance') {
        const c = byId(d.criteria.filter(c => c.active), data.criterionId, '当前验收条件');
        const selected = ids(data.artifactIds || [], d.artifacts, '成果');
        if (!['accept', 'reject'].includes(data.decision)) throw Error('验收结论必须是通过或退回');
        if (data.confirmed !== true) throw Error('请明确确认已核对所选成果');
        if (data.decision === 'accept') {
          const required = d.packages.filter(w => w.criterionIds.includes(c.id));
          if (!required.length || !selected.length) throw Error('验收条件尚无模块或成果');
          const artifacts = selected.map(id => byId(d.artifacts, id, '成果'));
          if (artifacts.some(a => !required.some(w => w.id === a.workId) || !artifactCurrent(p, a))) throw Error('成果不适用或需要复核');
          if (required.some(w => !artifacts.some(a => a.workId === w.id))) throw Error('所选成果尚未覆盖全部负责模块');
        }
        bound(d.acceptances);
        const record = { id: randomUUID(), criterionId: c.id, criterionVersion: c.version, artifactIds: selected,
          artifacts: selected.map(id => { const a = byId(d.artifacts, id, '成果'); return { id, version: a.version }; }),
          decision: data.decision, note: text(data.note, this.limits, '验收依据'), source: 'user-panel', at: stamp(),
          basis: acceptanceBasis(p, c, selected) };
        d.acceptances.push(record); changedId = record.id;
      } else throw Error('未知交付操作');
      event(d, args.action, changedId);
      return { revision: d.revision, objectId: changedId };
    });
  }
}
