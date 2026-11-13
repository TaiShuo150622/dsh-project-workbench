function coordinationThreads(project, order = project?.coordination?.order || []) {
  if (!project) return [];
  const byId = new Map(project.threads.map(t => [t.id, t]));
  const ids = [...new Set(order.filter(id => byId.has(id)))];
  for (const t of project.threads) if (!ids.includes(t.id)) ids.push(t.id);
  return ids.map(id => byId.get(id));
}
function coordinationDraft(project, value = project.coordination) {
  return {
    revision: value?.revision || 0,
    goal: value?.goal || '',
    criteriaText: (value?.criteria || []).join('\n'),
    order: coordinationThreads(project, value?.order || []).map(t => t.id),
  };
}

function CoordinationPanel({ project, request, onSaved }) {
  const [draft, setDraft] = React.useState(() => coordinationDraft(project));
  const [dirty, setDirty] = React.useState(false), [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(''), [notice, setNotice] = React.useState('');
  const [conflict, setConflict] = React.useState(null);
  const saved = project.coordination || { revision: 0, goal: '', criteria: [], order: [] };
  const latest = conflict && conflict.revision > saved.revision ? conflict : saved;
  const threadIds = project.threads.map(t => t.id).join('\n');
  React.useEffect(() => {
    // Polling may be older than a just-accepted save, and must never erase a draft.
    if (!dirty && latest.revision >= draft.revision) setDraft(coordinationDraft(project, latest));
  }, [latest.revision, threadIds, dirty, draft.revision]);
  const ordered = coordinationThreads(project, draft.order);
  const stale = latest.revision > draft.revision;
  function edit(key, value) { setDraft(previous => ({ ...previous, [key]: value })); setDirty(true); setNotice(''); }
  function move(id, delta) {
    const ids = ordered.map(t => t.id), from = ids.indexOf(id), to = from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    edit('order', ids);
  }
  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('coordination-update', {
        projectId: project.id, expectedRevision: draft.revision,
        goal: draft.goal, criteria: draft.criteriaText.split('\n').map(value => value.trim()).filter(Boolean),
        order: ordered.map(t => t.id),
      });
      if (result?.conflict) {
        setConflict(result.coordination);
        setError('目标或顺序已被其他操作更新。本次未保存，你的草稿仍保留；请核对最新内容后再修改。');
      } else {
        if (!result?.coordination || !Number.isSafeInteger(result.coordination.revision)) throw Error('保存结果不完整，请刷新后核对');
        setDraft(coordinationDraft(project, result.coordination)); setDirty(false); setConflict(null);
        setNotice('已保存。后续任务按新顺序和目标启动，正在运行的任务继续当前工作。');
      }
      await onSaved?.();
    } catch (error) { setError(error.message || '保存失败，请稍后重试'); }
    finally { setBusy(false); }
  }
  function loadLatest() {
    setDraft(coordinationDraft(project, latest)); setDirty(false); setConflict(null); setError(''); setNotice('已载入最新保存的内容。');
  }
  return h('section', { className: 'pw-card pw-coordination', 'aria-label': '项目目标与优先顺序' },
    h('h3', null, '整体目标与验收'),
    h('p', { className: 'pw-muted' }, `目标版本 ${draft.revision}。验收条件用于核对结果，编辑目标不会授予新的操作权限。`),
    h('form', { onSubmit: save, style: { display: 'grid', gap: 12 } },
      h('label', null, '整体目标', h('textarea', { 'aria-label': '整体目标', value: draft.goal, disabled: busy, onChange: event => edit('goal', event.target.value), placeholder: '这一阶段希望交付什么完整结果' })),
      h('label', null, '验收条件（每行一项）', h('textarea', { 'aria-label': '验收条件', value: draft.criteriaText, disabled: busy || !!project.delivery, onChange: event => edit('criteriaText', event.target.value), placeholder: '怎样判断整体结果满足要求' })),
      project.delivery && h('p', { className: 'pw-muted' }, '已启用交付管理，请在交付管理中逐项修改验收条件，以保留条件身份和历史版本。'),
      h('strong', null, '线程优先顺序'),
      h('p', { className: 'pw-muted' }, '顺序只影响依赖已满足的后续任务；运行中的线程不会被中断。'),
      ordered.length ? h('ol', { style: { display: 'grid', gap: 8, margin: 0, paddingLeft: 24 } }, ...ordered.map((t, index) => h('li', { key: t.id },
        h('div', { className: 'pw-bar' },
          h('span', { style: { flex: 1 } }, t.title),
          h('small', null, labels[t.running ? 'running' : t.phase] || t.phase),
          h('button', { type: 'button', disabled: busy || index === 0, 'aria-label': `上移 ${t.title}`, onClick: () => move(t.id, -1) }, '上移'),
          h('button', { type: 'button', disabled: busy || index === ordered.length - 1, 'aria-label': `下移 ${t.title}`, onClick: () => move(t.id, 1) }, '下移')))))
        : h('p', { className: 'pw-muted' }, '还没有工作线程，创建后可在这里调整顺序。'),
      stale && h('p', { className: 'pw-muted' }, `已有更新的目标版本 ${latest.revision}。未保存的草稿不会被自动替换。`),
      error && h('div', { className: 'pw-error', role: 'alert' }, error),
      notice && h('p', { role: 'status', className: 'pw-muted' }, notice),
      h('div', { className: 'pw-bar' },
        h('button', { type: 'submit', className: 'pw-primary', disabled: busy || !dirty }, busy ? '正在保存…' : '保存目标与顺序'),
        (dirty || stale) && h('button', { type: 'button', disabled: busy, onClick: loadLatest }, '载入最新保存内容（替换草稿）'))));
}
