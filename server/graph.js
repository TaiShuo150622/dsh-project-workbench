/** A projection only: graph reads never mutate records or call the task scheduler. */
export function projectGraph(p, view, native) {
  const nodes = [], edges = [], id = (kind, objectId) => `${p.id}/${kind}/${objectId}`;
  const node = (kind, objectId, title, status, extra = {}) => {
    const value = { id: id(kind, objectId), kind, objectId, title, status, ...extra };
    nodes.push(value); return value.id;
  };
  const edge = (from, to, kind, label) => edges.push({ id: `${kind}:${from}:${to}`, from, to, kind, label });
  const goal = node('goal', p.id, view.goal || '尚未设置目标', view.summary.complete ? '已验收' : '待交付', { version: view.goalRevision });
  for (const c of view.criteria.filter(c => c.active)) {
    node('criterion', c.id, c.text, c.status, { version: c.version });
    edge(goal, id('criterion', c.id), 'alignment', '验收条件');
    node('acceptance', c.id, c.text, c.status, { version: c.version });
  }
  const decisionIds = new Set(view.packages.flatMap(w => w.decisionIds));
  for (const d of p.continuity?.decisions || []) if (decisionIds.has(d.id)) node('decision', d.id, d.text, d.status);
  for (const w of view.packages) {
    node('package', w.id, w.title, view.artifacts.some(a => a.workId === w.id && a.stale) ? '待复核'
      : view.artifacts.some(a => a.workId === w.id) ? '已有成果' : '缺少成果', { version: w.version });
    for (const c of w.criterionIds) if (view.criteria.some(x => x.id === c && x.active)) edge(id('criterion', c), id('package', w.id), 'alignment', '负责');
    for (const upstream of w.dependsOn) edge(id('package', upstream), id('package', w.id), 'delivery-dependency', '提供输入');
    for (const d of w.decisionIds) edge(id('decision', d), id('package', w.id), 'decision', '适用决定');
  }
  for (const t of p.threads) {
    node('thread', t.id, t.title, t.phase, { sessionId: t.sessionId || null, generation: t.generation,
      runtimeState: native?.runtimeState?.(t.sessionId) || 'unknown', checkedAt: p.recovery?.checkedAt || null });
    for (const w of view.packages.filter(w => w.threadIds.includes(t.id))) edge(id('package', w.id), id('thread', t.id), 'assignment', '执行');
    for (const dep of t.dependsOn || []) edge(id('thread', dep), id('thread', t.id), 'execution-dependency', '启动前置');
  }
  for (const a of view.artifacts) {
    node('artifact', a.id, a.title, a.stale ? '待复核' : '待人工核对', { version: a.version });
    edge(id('package', a.workId), id('artifact', a.id), 'output', '产出');
    if (a.threadId) edge(id('thread', a.threadId), id('artifact', a.id), 'evidence', '来源');
    const w = view.packages.find(w => w.id === a.workId);
    for (const c of w.criterionIds) if (view.criteria.some(x => x.id === c && x.active)) edge(id('artifact', a.id), id('acceptance', c), 'evidence', '提交核对');
  }
  return { projectId: p.id, revision: view.revision, sourceToken: view.sourceToken, nodes, edges,
    evidenceBoundary: '图为项目记录的视图。登记的成果仍需核对；依赖关联不改变任务启动规则。' };
}
