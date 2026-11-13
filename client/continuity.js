function ContinuityPanel({ project, refresh, openProject, openSession }) {
  const c = project.continuity || { revision: 0, decisions: [], handoffs: [], previousLeads: [] };
  const [content, setContent] = React.useState(''), [rationale, setRationale] = React.useState('');
  const [supersedesId, setSupersedesId] = React.useState(''), [decisionRevision, setDecisionRevision] = React.useState(null);
  const [nextStep, setNextStep] = React.useState(''), [noteRevision, setNoteRevision] = React.useState(null);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState('');
  const [snapshot, setSnapshot] = React.useState(null), [notice, setNotice] = React.useState('');
  const [readSection, setReadSection] = React.useState('current'), [readId, setReadId] = React.useState('');
  React.useEffect(() => {
    setContent(''); setRationale(''); setSupersedesId(''); setNextStep('');
    setDecisionRevision(null); setNoteRevision(null); setSnapshot(null); setNotice(''); setError(''); setReadSection('current'); setReadId('');
  }, [project.id]);
  const editDecision = setter => event => { setter(event.target.value); setDecisionRevision(value => value ?? c.revision); };
  const run = async (op, payload = {}) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(op, { projectId: project.id, ...payload });
      await refresh();
      return result;
    } catch (e) {
      setError(e.message);
      await refresh();
      return null;
    } finally { setBusy(false); }
  };
  const saveDecision = async event => {
    event.preventDefault();
    const result = await run('continuity-decision', { expectedRevision: decisionRevision ?? c.revision,
      text: content, rationale, ...(supersedesId ? { supersedesId } : {}) });
    if (result) { setContent(''); setRationale(''); setSupersedesId(''); setDecisionRevision(null); setNotice('决定已保存，旧决定的替代关系保留。'); }
  };
  const saveHandoff = async event => {
    event.preventDefault();
    const result = await run('continuity-handoff', { expectedRevision: noteRevision ?? c.revision, nextStep });
    if (result) { setNoteRevision(null); setNotice(`接续包 ${result.handoff.id} 已保存，可在接续记录中按页查看。开始工作前仍需核对当前状态。`); }
  };
  const takeover = async () => {
    const result = await run('continuity-takeover', { expectedRevision: c.revision });
    if (result) setNotice('新总对话已接手。汇报暂存中，可先开始接续，再打开总对话。');
  };
  const begin = async () => {
    const result = await run('continuity-begin', { expectedRevision: c.revision });
    if (result) setNotice('已允许接收汇报。需要恢复核对的消息仍会暂存；没有汇报时等待你发送首条消息。');
  };
  const read = async (section = 'current', id, page) => {
    const result = await run('continuity', { section, ...(id ? { id } : {}), ...page });
    if (result) setSnapshot(result);
  };
  const active = c.decisions.filter(d => d.status === 'active');
  const pending = project.continuityDelivery?.pending || 0;
  const recoveryHeld = project.continuityDelivery?.recoveryHeld || 0;
  return h('section', { className: 'pw-thread', 'aria-label': '决定与接续' },
    h('div', { className: 'pw-bar' }, h('h3', { style: { flex: 1 } }, '决定与接续'), h('small', null, `记录版本 ${c.revision}`)),
    h('p', { className: 'pw-muted' }, '保存当前有效决定与下一步，换总对话时保留工作线程、成果和历史。'),
    h(ErrorBox, { error }), notice && h('p', { role: 'status', className: 'pw-summary' }, notice),
    h('div', { className: 'pw-summary' }, active.length
      ? h('ul', null, ...active.map(d => h('li', { key: d.id }, d.text, h('small', null, ` · ${d.id}`), d.rationale && h('div', { className: 'pw-muted' }, `理由：${d.rationale}`))))
      : '尚未登记有效决定。'),
    h('p', { className: 'pw-muted' }, `当前展示 ${active.length} / ${c.counts?.active ?? active.length} 条有效决定预览，长正文会明确省略；采用决定前请查看完整记录。`),
    h('button', { disabled: busy, onClick: () => read('decisions') }, '查看全部决定与替代关系'),
    h('details', null, h('summary', null, '登记或替代决定'),
      h('form', { className: 'pw-form', onSubmit: saveDecision },
        h('label', null, '决定内容', h('textarea', { value: content, disabled: busy, required: true, maxLength: LIMITS.maxText, onChange: editDecision(setContent) })),
        h('label', null, '理由（可选）', h('textarea', { value: rationale, disabled: busy, maxLength: LIMITS.maxText, onChange: editDecision(setRationale) })),
        h('label', null, '替代的决定 ID（留空表示新增）', h('input', { value: supersedesId, disabled: busy, onChange: editDecision(setSupersedesId), placeholder: '从完整决定记录复制 ID' })),
        decisionRevision !== null && decisionRevision !== c.revision && h('p', { role: 'status', className: 'pw-muted' },
          '记录已在编辑期间变化。请核对上面的有效决定，再确认采用最新版本。'),
        decisionRevision !== null && decisionRevision !== c.revision && h('button', { type: 'button', disabled: busy,
          onClick: () => setDecisionRevision(c.revision) }, '已核对最新决定'),
        h('button', { type: 'submit', disabled: busy || (decisionRevision !== null && decisionRevision !== c.revision) }, '保存决定'))),
    h('details', null, h('summary', null, '保存接续包'),
      h('form', { className: 'pw-form', onSubmit: saveHandoff },
        h('label', null, '下一步说明（可选）', h('textarea', { value: nextStep, disabled: busy, maxLength: LIMITS.maxText,
          placeholder: '说明接手者需要继续核对或推进的事项。',
          onChange: event => { setNextStep(event.target.value); setNoteRevision(value => value ?? c.revision); } })),
        h('p', { className: 'pw-muted' }, '接续包保存当前目标、有效决定、线程状态与成果出处。线程汇报仍需核对，保存快照不会启动工作。'),
        noteRevision !== null && noteRevision !== c.revision && h('button', { type: 'button', disabled: busy,
          onClick: () => setNoteRevision(c.revision) }, '已核对最新记录，保留这份说明'),
        h('button', { type: 'submit', disabled: busy || (noteRevision !== null && noteRevision !== c.revision) }, '保存接续包'))),
    h('div', { className: 'pw-bar' },
      h('button', { disabled: busy, onClick: () => read() }, '查看当前接续信息'),
      h('button', { disabled: busy, onClick: () => openProject(project) }, '打开当前总对话')),
    h('p', { className: 'pw-muted' }, `当前总对话：${project.leadState?.reason || '尚未核对宿主状态'}。创建接续会话后，汇报会暂存，原工作线程继续保留。`),
    h('button', { disabled: busy || project.leadState?.state !== 'idle', onClick: takeover }, '创建新总对话并接手'),
    c.deliveryPaused && h('div', { className: 'pw-thread' },
      h('p', { className: 'pw-summary' }, `新总对话尚未接收汇报，暂存 ${pending} 条。${recoveryHeld ? `其中 ${recoveryHeld} 条仍需恢复核对。` : ''}`),
      h('button', { disabled: busy, className: 'pw-primary', onClick: begin }, '开始接续并接收汇报')),
    c.previousLeads.length > 0 && h('details', null, h('summary', null, '历史总对话'),
      ...c.previousLeads.map(lead => h('p', { key: lead.sessionId, className: 'pw-bar' },
        h('small', null, lead.replacedAt), h('button', { onClick: () => openSession(lead.sessionId) }, '打开历史总对话'))),
      h('button', { disabled: busy, onClick: () => read('previousLeads') }, '查看全部历史总对话记录'),
      h('p', { className: 'pw-muted' }, '历史总对话可查看项目记录，不能继续分派工作线程。')),
    c.decisions.some(d => d.status === 'superseded') && h('details', null, h('summary', null, '已替代的决定'),
      ...c.decisions.filter(d => d.status === 'superseded').map(d => h('article', { key: d.id, className: 'pw-summary' },
        h('p', null, d.text), h('small', null, `已替代为：${c.decisions.find(next => next.id === d.supersededBy)?.text || d.supersededBy}`)))),
    c.handoffs.length > 0 && h('details', null, h('summary', null, '接续记录'),
      ...c.handoffs.map(item => h('p', { key: item.id, className: 'pw-bar' },
        h('small', null, `${item.createdAt} · ${item.kind === 'takeover' ? '总对话接手' : '保存快照'}`),
        h('button', { disabled: busy, onClick: () => read('handoff', item.id) }, '查看快照'))),
      h('button', { disabled: busy, onClick: () => read('handoffs') }, '查看全部快照目录')),
    h('details', null, h('summary', null, '按记录读取完整原文'),
      h('form', { className: 'pw-form', onSubmit: event => { event.preventDefault(); return read(readSection, readId); } },
        h('label', null, '记录类别', h('select', { value: readSection, onChange: event => setReadSection(event.target.value) },
          ...[['current', '当前接续信息'], ['decision', '决定原文'], ['thread', '工作线程记录'], ['handoff', '已保存快照'], ['decisions', '全部决定'], ['handoffs', '全部快照目录'], ['previousLeads', '历史总对话记录']]
            .map(([value, label]) => h('option', { key: value, value }, label)))),
        ['decision', 'thread', 'handoff'].includes(readSection) && h('label', null, '记录 ID', h('input', { value: readId, required: true, onChange: event => setReadId(event.target.value) })),
        h('button', { disabled: busy }, '读取原文第一页'))),
    snapshot && h('details', { open: true }, h('summary', null, '接续包与出处'),
      h('p', { className: 'pw-muted' }, `${snapshot.note} · 字符 ${snapshot.offset}–${snapshot.offset + snapshot.text.length} / ${snapshot.totalChars} · 核对时间 ${snapshot.readAt}`),
      h('pre', { className: 'pw-diff' }, snapshot.text),
      h('div', { className: 'pw-bar' },
        snapshot.offset > 0 && h('button', { disabled: busy, onClick: () => read(snapshot.section, snapshot.id, { offset: Math.max(0, snapshot.offset - snapshot.pageCharLimit), sourceToken: snapshot.sourceToken }) }, '上一页'),
        snapshot.nextOffset !== null && h('button', { disabled: busy, onClick: () => read(snapshot.section, snapshot.id, { offset: snapshot.nextOffset, sourceToken: snapshot.sourceToken }) }, '下一页'),
        h('button', { disabled: busy, onClick: () => read(snapshot.section, snapshot.id) }, '重新核对第一页'))));
}
