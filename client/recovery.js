const recoveryStateLabels = { running: '运行中', idle: '当前空闲', missing: '未找到原会话', unknown: '状态未知' };
const recoveryReasonLabels = {
  'agent-running': '已观察到运行中的 Agent', 'agent-idle': '已观察到空闲 Agent',
  'pending-input': '仍有待处理输入', 'agent-state-unavailable': 'Agent 状态无法确认',
  'session-not-assigned': '尚无已记录会话', 'session-not-found': '宿主明确未找到原会话',
  'session-not-loaded': '会话记录存在或尚未加载，执行状态待核实',
  'inspection-unavailable': '暂时无法核对原会话', 'task-changed-during-check': '核对期间任务已变化，请再次核对',
};
function recoveryPresentation(project, connected) {
  const observation = project?.recovery;
  return {
    stale: !connected || !observation?.checkedAt || observation.stale,
    connectionLabel: connected ? '连接正常' : '连接暂不可用',
    checkedAt: observation?.checkedAt || null,
    runtime: observation?.currentRuntime || observation?.runtime || null,
    lead: observation?.lead || null,
    threads: observation?.threads || [],
  };
}
function recoveryCheckedRow(project, thread, connected) {
  if (!connected || thread.running) return null;
  const observation = project?.recovery;
  if (!observation?.checkedAt || observation.runtime?.id !== observation.currentRuntime?.id) return null;
  return observation.threads?.find(row => row.threadId === thread.id && row.sessionId === (thread.sessionId || null) && row.generation === (thread.generation || 0)) || null;
}
function recoveryCanRetry(project, thread, connected) {
  const row = recoveryCheckedRow(project, thread, connected);
  return !!row && thread.continueAvailable && (thread.resumeUnstarted || thread.resumeCreation
    ? row?.runtimeState === 'missing' && row.reason === 'session-not-assigned'
    : row?.runtimeState === 'idle' && thread.runtimeState === 'idle');
}
function recoveryCanFollowup(project, thread, connected) {
  const row = recoveryCheckedRow(project, thread, connected);
  return !!row && thread.followupAvailable && row.runtimeState === 'idle' && thread.runtimeState === 'idle';
}
function RecoveryPanel({ project, connected, busy, onCheck, onContinue, onFollowup }) {
  const state = recoveryPresentation(project, connected);
  return h('section', { className: 'pw-card', 'aria-label': '原任务状态核对' },
    h('div', { className: 'pw-bar' }, h('strong', { style: { flex: 1 } }, '原任务状态'),
      h('span', { role: 'status' }, state.connectionLabel),
      h('button', { disabled: busy, onClick: onCheck }, busy ? '正在核对…' : '核对原任务状态')),
    h('p', { className: 'pw-muted' }, state.checkedAt ? `最后核对：${new Date(state.checkedAt).toLocaleString()}` : '尚未核对原任务状态'),
    state.runtime && h('p', { className: 'pw-muted' }, `运行实例 ${state.runtime.id} · ${state.runtime.platform}/${state.runtime.arch} · 启动于 ${new Date(state.runtime.startedAt).toLocaleString()}`),
    state.stale && h('p', { className: 'pw-muted', role: 'status' }, '状态已陈旧，请以重新核对后的观察为准。'),
    h('p', { className: 'pw-muted' }, '核对只读取原任务状态；重新尝试任务是单独的操作。'),
    h('p', { className: 'pw-muted' }, `总对话 · ${recoveryStateLabels[state.lead?.runtimeState || 'unknown']} · ${recoveryReasonLabels[state.lead?.reason] || '尚无核对记录'}`),
    ...project.threads.map(thread => {
      const row = state.threads.find(row => row.threadId === thread.id);
      return h('div', { key: thread.id, className: 'pw-summary' },
        h('strong', null, thread.title), ' · ', recoveryStateLabels[row?.runtimeState || 'unknown'],
        h('small', null, ` · ${recoveryReasonLabels[row?.reason] || '尚无核对记录'}`),
        thread.recoveryHold && h('p', { className: 'pw-muted' }, '原任务与成果已保留，自动派发暂缓。'),
        thread.error && h('p', { className: 'pw-error' }, thread.error),
        thread.followupAvailable && h('p', { className: 'pw-muted' }, `另有 ${thread.followups.length} 条此前已排队后续任务；原成果保留。`),
        onContinue && thread.continueAvailable && h('button', { disabled: busy || !recoveryCanRetry(project, thread, connected), onClick: () => onContinue(thread.id) }, '继续原任务（可能接着执行）'),
        onFollowup && thread.followupAvailable && h('button', { disabled: busy || !recoveryCanFollowup(project, thread, connected), onClick: () => onFollowup(thread.id) }, '继续已排队后续任务'));
    }));
}
