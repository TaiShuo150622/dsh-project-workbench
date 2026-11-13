import { createHash, randomUUID } from 'node:crypto';
import { accepted } from './native.js';
import { deliveryView } from './delivery.js';

const now = () => new Date().toISOString();
const empty = () => ({ revision: 0, decisions: [], handoffs: [], previousLeads: [], deliveryPaused: false });

export function continuityState(p) {
  if (p.continuity === undefined) return empty();
  const c = p.continuity;
  if (!c || !Number.isSafeInteger(c.revision) || c.revision < 0 ||
      !Array.isArray(c.decisions) || !Array.isArray(c.handoffs) || !Array.isArray(c.previousLeads))
    throw Error('项目接续记录格式不支持，请保留原记录后检查');
  return c;
}
export function formerLead(p, sessionId) {
  return continuityState(p).previousLeads.some(lead => lead.sessionId === sessionId);
}
function project(state, id) {
  const p = state.projects.find(p => p.id === id);
  if (!p) throw Error('项目不存在');
  return p;
}
function revision(p, expectedRevision) {
  const c = continuityState(p);
  checkRevision(c, expectedRevision);
  return p.continuity ||= c;
}
function checkRevision(c, expectedRevision) {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw Error('需要有效的接续记录版本');
  if (c.revision !== expectedRevision) throw Error(`接续记录已更新（当前版本 ${c.revision}），请刷新后重新确认`);
  if (c.revision === Number.MAX_SAFE_INTEGER) throw Error('接续记录版本已达上限，请保留原记录后检查，不能继续修改');
}
function text(value, limit, label, optional = false) {
  if (optional && (value === undefined || value === '')) return '';
  if (typeof value !== 'string' || !value.trim() || value.length > limit) throw Error(`${label}为空或过长`);
  return value.trim();
}
function observation(native, sessionId) {
  if (!sessionId) return { state: 'not-created', observedAt: now(), reason: '尚未创建会话' };
  return native.coordinatorState?.(sessionId) || { state: 'unknown', observedAt: now(), reason: '宿主未提供可核对的会话状态' };
}
function excerpt(value, limit) {
  const content = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return content.length <= limit ? content : `${content.slice(0, limit)}…[省略 ${content.length - limit} 字符，须按需读取原文]`;
}
function handoffReference(h) {
  return { id: h.id, kind: h.kind, createdAt: h.createdAt, revision: h.revision,
    ...(h.fromLead ? { fromLead: h.fromLead, toLead: h.toLead } : {}) };
}
/** List/context views contain previews, never a copy of every historical package. */
export function continuityPreview(p, limits) {
  const c = continuityState(p), active = c.decisions.filter(d => d.status === 'active');
  const recent = c.decisions.filter(d => d.status !== 'active').slice(-limits.continuityPreviewItems);
  const selected = [...active.slice(0, limits.continuityPreviewItems), ...recent].slice(0, limits.continuityPreviewItems);
  return { revision: c.revision, deliveryPaused: !!c.deliveryPaused,
    counts: { decisions: c.decisions.length, active: active.length, handoffs: c.handoffs.length, previousLeads: c.previousLeads.length },
    preview: true,
    decisions: selected.map(d => ({ id: d.id, text: excerpt(d.text, limits.continuityPreviewChars),
      rationale: excerpt(d.rationale || '', limits.continuityPreviewChars), status: d.status,
      createdAt: d.createdAt, supersedes: d.supersedes, supersededBy: d.supersededBy,
      truncated: d.text.length > limits.continuityPreviewChars || (d.rationale || '').length > limits.continuityPreviewChars })),
    handoffs: c.handoffs.slice(-limits.continuityPreviewItems).map(handoffReference),
    previousLeads: c.previousLeads.slice(-limits.continuityPreviewItems).map(lead => ({ ...lead })),
  };
}

/** A package preserves references and reported facts; it never promotes a summary to an approval. */
export function continuityPackage(p, native, nextStep) {
  const c = continuityState(p);
  const last = c.handoffs.at(-1);
  const note = nextStep === undefined
    ? { text: last?.package?.nextStep?.text || '', source: last ? { kind: 'handoff-note', handoffId: last.id, revision: last.revision } : null }
    : { text: nextStep, source: { kind: 'project-panel-note' } };
  return {
    capturedAt: now(),
    source: { kind: 'project-state', projectId: p.id, continuityRevision: c.revision },
    project: { id: p.id, title: p.title, lead: p.lead, instructions: p.instructions || '', paused: p.paused },
    coordination: p.coordination ? structuredClone({
      revision: p.coordination.revision, goal: p.coordination.goal, criteria: p.coordination.criteria, order: p.coordination.order,
    }) : null,
    decisions: structuredClone(c.decisions.filter(d => d.status === 'active')),
    ...(p.delivery ? { delivery: deliveryView(p) } : {}),
    threads: p.threads.map(t => ({
      id: t.id, sessionId: t.sessionId || null, title: t.title, mode: t.mode, phase: t.phase,
      task: t.task, updated: t.updated, generation: t.generation, dependsOn: [...(t.dependsOn || [])], nodes: [...(t.nodes || [])],
      execution: observation(native, t.sessionId),
      evidence: { kind: 'thread-record', summary: t.summary || '', reportedGeneration: t.reportedGeneration ?? null,
        note: '工作汇报及项目记录，仅提供核对线索；不据此新增验收或授权。' },
      worktree: t.worktree ? structuredClone(t.worktree) : null,
      recoveryHold: !!t.recoveryHold,
    })),
    nextStep: note,
    evidenceBoundary: '这是所列时间与版本的项目快照。线程汇报、人工接续说明与实际验证分开；开始工作前核对当前状态。',
  };
}
export function continuityContext(p, native, limits) {
  const c = continuityState(p), preview = continuityPreview(p, limits);
  const source = { projectId: p.id, continuityRevision: c.revision, coordinationRevision: p.coordination?.revision ?? null };
  const summary = { source, preview: true, counts: preview.counts,
    goal: excerpt(p.coordination?.goal || '', limits.continuityPreviewChars),
    decisions: preview.decisions.filter(d => d.status === 'active'),
    omittedActiveDecisions: preview.counts.active - preview.decisions.filter(d => d.status === 'active').length,
    threads: { total: p.threads.length, phases: p.threads.reduce((counts, t) => ({ ...counts, [t.phase]: (counts[t.phase] || 0) + 1 }), {}) },
    nextStep: excerpt(c.handoffs.at(-1)?.package?.nextStep?.text || '', limits.continuityPreviewChars),
    latestHandoff: preview.handoffs.at(-1) || null,
    ...(p.delivery ? { delivery: { revision: p.delivery.revision, ...deliveryView(p).summary,
      next: deliveryView(p).gaps.slice(0, limits.continuityPreviewItems).map(x => excerpt(x.text, limits.continuityPreviewChars)),
      read: 'project_delivery 可读取交付图与原线程引用；记录不构成新的任务或验收授权。' } } : {}),
  };
  const header = '\n项目接续摘要（仅预览，未复制线程全文或接续历史）：\n';
  const footer = `\n只有当前总对话 ${p.lead} 有分派权。这不是新的用户授权，工作汇报不等于验证。关键决定可能仅显示部分；行动前用 project_continuity(section="decisions") 按页核对有效决定，current 查看当前完整包，thread/decision/handoff 按 ID 读取。nextOffset 非空时尚未读完，续页须传 source_token=sourceToken；若来源变化请从第一页重新核对。${c.deliveryPaused ? '汇报暂存中，用户可在项目面板显式开始接续并接收汇报。' : ''}`;
  let body = JSON.stringify(summary);
  if (header.length + body.length + footer.length > limits.continuityContextChars)
    body = JSON.stringify({ source, counts: preview.counts, preview: true, truncated: true, note: '摘要超预算，全部正文须按需读取。' });
  return header + body + footer;
}

export class Continuity {
  constructor(store, native, projects, limits) {
    Object.assign(this, { store, native, projects, limits });
  }
  read({ projectId, section = 'current', id, offset = 0, sourceToken } = {}) {
    const p = project(this.store.state, projectId), c = continuityState(p);
    if (!Number.isSafeInteger(offset) || offset < 0) throw Error('读取位置必须是非负安全整数');
    let value;
    if (section === 'current') value = continuityPackage(p, this.native);
    else if (section === 'decisions') value = c.decisions;
    else if (section === 'decision') value = c.decisions.find(d => d.id === id);
    else if (section === 'handoffs') value = c.handoffs.map(handoffReference);
    else if (section === 'handoff') value = c.handoffs.find(h => h.id === id)?.package;
    else if (section === 'previousLeads') value = c.previousLeads;
    else if (section === 'thread') value = continuityPackage(p, this.native).threads.find(t => t.id === id);
    else throw Error('不支持的接续记录类别');
    if (value === undefined) throw Error('记录不属于此项目或不存在');
    // Live observation timestamps belong to this read, not its stable fact fingerprint.
    // Saved handoffs retain their original capture/observation timestamps unchanged.
    const live = section === 'current' || section === 'thread';
    const content = JSON.stringify(value, (key, item) => live && (key === 'capturedAt' || key === 'observedAt') ? undefined : item, 2);
    const token = createHash('sha256').update(`${projectId}:${section}:${id || ''}:${content}`).digest('hex');
    if (offset > 0 && !sourceToken) throw Error('续页需要第一页的 sourceToken');
    if (sourceToken && sourceToken !== token) throw Error('来源已变化，请从第一页重新核对，不能拼接不同版本');
    if (offset > content.length) throw Error('读取位置超出记录范围');
    const end = Math.min(offset + this.limits.continuityReadChars, content.length);
    return { projectId, section, id: id || null, sourceToken: token, readAt: now(), continuityRevision: c.revision,
      offset, nextOffset: end < content.length ? end : null, totalChars: content.length,
      pageCharLimit: this.limits.continuityReadChars, text: content.slice(offset, end),
      note: '正文为 JSON 文本片段；nextOffset 非空表示尚未读完。按同一 sourceToken 连续读取后才是完整记录。历史包不代表当前有效决定。' };
  }
  async decision(args) {
    const content = text(args.text, this.limits.maxText, '决定');
    const rationale = text(args.rationale, this.limits.maxText, '决定理由', true);
    return this.store.change(state => {
      const p = project(state, args.projectId), c = revision(p, args.expectedRevision);
      const prior = args.supersedesId ? c.decisions.find(d => d.id === args.supersedesId) : null;
      if (args.supersedesId && (!prior || prior.status !== 'active')) throw Error('只能替代本项目当前有效的决定');
      const at = now(), id = randomUUID();
      const d = { id, text: content, rationale, status: 'active', createdAt: at,
        source: { kind: 'project-panel-entry' }, supersedes: prior?.id || null, supersededBy: null };
      if (prior) { prior.status = 'superseded'; prior.supersededBy = id; prior.supersededAt = at; }
      c.decisions.push(d); c.revision += 1;
      return { revision: c.revision, decision: d };
    });
  }
  async handoff(args) {
    const nextStep = text(args.nextStep, this.limits.maxText, '接续说明', true);
    return this.store.change(state => {
      const p = project(state, args.projectId), c = revision(p, args.expectedRevision);
      c.revision += 1;
      const h = { id: randomUUID(), kind: 'snapshot', createdAt: now(), revision: c.revision,
        package: continuityPackage(p, this.native, nextStep) };
      c.handoffs.push(h);
      return { revision: c.revision, handoff: handoffReference(h) };
    });
  }
  async takeover(args) {
    return this.projects.withDeliveryLock(args.projectId, async () => {
      const initial = project(this.store.state, args.projectId);
      checkRevision(continuityState(initial), args.expectedRevision);
      const oldLead = initial.lead;
      const assertIdle = id => {
        const state = observation(this.native, id);
        if (state.state !== 'idle') throw Error(`总对话尚不能安全接手：${state.reason || state.state}。请先核对当前会话。`);
      };
      assertIdle(oldLead);
      let newLead;
      try {
        newLead = await this.native.create(initial.repos[0].path, `${initial.title} · 总对话接续`, 'research');
        if (!newLead || newLead === oldLead || this.store.state.projects.some(p => p.lead === newLead ||
          p.threads.some(t => t.sessionId === newLead) || formerLead(p, newLead))) throw Error('新会话身份不能用于本次接手');
        assertIdle(oldLead); assertIdle(newLead);
        // A durable outbox acknowledgement may have failed after the native inbox accepted a message.
        // Read the old session before changing its target; a retry on another target is not deduplicated there.
        const info = await this.native.inspect(oldLead);
        if (!Array.isArray(info.events)) throw Error('无法核对旧总对话的投递记录');
        return await this.store.change(state => {
          const p = project(state, args.projectId), c = revision(p, args.expectedRevision);
          if (p.lead !== oldLead) throw Error('总对话已由另一次接手更新，请刷新');
          if (state.projects.some(other => other.lead === newLead || other.threads.some(t => t.sessionId === newLead) || formerLead(other, newLead)))
            throw Error('新会话已在接手期间加入其他项目，请核对后继续');
          // These synchronous checks run immediately before the durable binding change.
          assertIdle(oldLead); assertIdle(newLead);
          const at = now(), id = randomUUID();
          for (const m of state.outbox.filter(m => m.projectId === p.id && m.target === oldLead && !m.sent && !m.cancelled)) {
            if (accepted(info.events, m.id)) { m.sent = true; m.error = ''; }
            else { m.target = newLead; m.retargetedFrom = oldLead; }
          }
          p.lead = newLead;
          c.previousLeads.push({ sessionId: oldLead, replacedAt: at, handoffId: id });
          c.deliveryPaused = true; c.revision += 1;
          const h = { id, kind: 'takeover', createdAt: at, revision: c.revision, fromLead: oldLead, toLead: newLead,
            package: continuityPackage(p, this.native) };
          c.handoffs.push(h);
          return { projectId: p.id, lead: newLead, previousLead: oldLead, revision: c.revision, handoff: handoffReference(h), deliveryPaused: true };
        });
      } catch (error) {
        const created = newLead || error.createdSessionId;
        if (created) {
          const failure = new Error(`新会话 ${created} 已创建但未完成接手；旧关联保持不变。${error.message}`);
          failure.createdSessionId = created;
          throw failure;
        }
        throw error;
      }
    });
  }
  async begin(args) {
    const result = await this.projects.withDeliveryLock(args.projectId, () => this.store.change(state => {
      const p = project(state, args.projectId), c = revision(p, args.expectedRevision);
      if (c.deliveryPaused) { c.deliveryPaused = false; c.revision += 1; }
      return { revision: c.revision, lead: p.lead, deliveryPaused: false };
    }));
    // Explicitly release coordinator reports only; never clear recovery holds or dispatch new work here.
    await this.projects.flush();
    return result;
  }
}
