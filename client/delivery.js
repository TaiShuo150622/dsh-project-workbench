function deliverySelections(label, items, values, onChange, busy, name = 'title') {
  return h('fieldset', { style: { border: '1px solid #8884', borderRadius: 8, padding: 10 } }, h('legend', null, label),
    items.length ? items.map(item => h('label', { key: item.id, style: { display: 'flex', gap: 8, alignItems: 'start', marginBottom: 7 } },
      h('input', { type: 'checkbox', style: { width: 'auto', marginTop: 4 }, checked: values.includes(item.id), disabled: busy || item.disabled,
        onChange: e => onChange(e.target.checked ? [...values, item.id] : values.filter(id => id !== item.id)) }),
      h('span', null, item[name], item.stale ? '（待复核）' : ''))) : h('small', null, '暂无可选项'));
}
function DeliveryPanel({ project, onOpenThread, focusThread }) {
  const [view, setView] = React.useState(null), [error, setError] = React.useState(''), [notice, setNotice] = React.useState('');
  const [busy, setBusy] = React.useState(false), [form, setForm] = React.useState(null), [selected, setSelected] = React.useState(null);
  const seq = React.useRef(0), alive = React.useRef(true);
  const formElement = React.useRef(null);
  const dependencies = JSON.stringify([project.coordination, project.delivery?.revision, project.continuity?.revision,
    project.threads.map(t => [t.id, t.generation, t.reportedGeneration, t.summary, t.phase, t.runtimeState])]);
  async function load() {
    const ticket = ++seq.current;
    try { const value = await api('delivery-read', { projectId: project.id });
      if (alive.current && ticket === seq.current) { setView(value); setError(''); }
    } catch (e) { if (alive.current && ticket === seq.current) setError(e.message); }
  }
  React.useEffect(() => { alive.current = true; return () => { alive.current = false; seq.current++; }; }, []);
  React.useEffect(() => { void load(); }, [project.id, dependencies]);
  React.useEffect(() => { if (focusThread) setSelected(`${project.id}/thread/${focusThread}`); }, [focusThread, project.id]);
  React.useEffect(() => { formElement.current?.scrollIntoView?.({ block: 'start' }); }, [form?.type, form?.data.id]);
  function open(type, data) { setForm({ type, data, revision: view.revision, sourceToken: view.sourceToken }); setError(''); setNotice(''); }
  function edit(key, value) { setForm(f => ({ ...f, data: { ...f.data, [key]: value } })); }
  async function mutate(action, data = {}, basis = form || view) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api('delivery-update', { projectId: project.id, expectedRevision: basis.revision, sourceToken: basis.sourceToken, action, data });
      if (!alive.current) return;
      setForm(null); await load(); setNotice('已保存并重新读取项目记录。原工作线程保持不变。');
    } catch (e) { if (alive.current) setError(e.message); }
    finally { if (alive.current) setBusy(false); }
  }
  function newPackage() { open('package-save', { title: '', input: '', output: '', done: '', owner: '', criterionIds: [], threadIds: [], dependsOn: [], decisionIds: [] }); }
  function newArtifact(w) {
    const t = project.threads.find(t => w.threadIds.includes(t.id));
    open('artifact-save', { workId: w.id, threadId: t?.id || '', title: '', summary: t?.summary || '', reference: t?.sessionId ? `session:${t.sessionId}` : '', evidence: '' });
  }
  const field = (label, key, multiline = false, optional = false) => h('label', null, label, h(multiline ? 'textarea' : 'input', {
    'aria-label': label, value: form.data[key] || '', required: !optional, disabled: busy, onChange: e => edit(key, e.target.value) }));
  const pick = (label, items, key, name) => deliverySelections(label, items, form.data[key] || [], values => edit(key, values), busy, name);
  const status = value => deliveryStatuses[value] || value;
  const node = view?.graph.nodes.find(n => n.id === selected);
  const work = node?.kind === 'package' ? view.packages.find(w => w.id === node.objectId) : null;
  const artifact = node?.kind === 'artifact' ? view.artifacts.find(a => a.id === node.objectId) : null;
  const criterion = ['criterion', 'acceptance'].includes(node?.kind) ? view.criteria.find(c => c.id === node.objectId) : null;
  const thread = node?.kind === 'thread' ? project.threads.find(t => t.id === node.objectId) : null;
  const openThread = id => { const t = project.threads.find(t => t.id === id); if (t) onOpenThread?.(t); };
  function acceptance(c) { open('acceptance', { criterionId: c.id, artifactIds: [], decision: 'accept', note: '', confirmed: false }); }
  const history = value => value?.history?.length ? h('details', null, h('summary', null, `查看 ${value.history.length} 个历史版本`),
    ...value.history.slice().reverse().map(v => h('article', { className: 'pw-card', key: v.version }, h('strong', null, `版本 ${v.version} · ${v.title || v.text}`),
      h('p', { className: 'pw-summary' }, v.summary || [v.input, v.output, v.done].filter(Boolean).join('\n') || v.text),
      v.reference && h('p', { className: 'pw-summary' }, v.reference), v.evidence && h('p', { className: 'pw-summary' }, v.evidence), h('small', null, v.updatedAt)))) : null;
  return h('section', { className: 'pw-card', 'aria-label': '项目交付管理' },
    h('div', { className: 'pw-bar' }, h('h3', { style: { flex: 1 } }, '交付管理与 DAG'), h('button', { onClick: load, disabled: busy }, '刷新交付记录')),
    h(ErrorBox, { error }), notice && h('p', { role: 'status', className: 'pw-muted' }, notice),
    !view ? h('p', null, '正在读取交付记录…') : !view.initialized ? h(React.Fragment, null,
      h('p', null, '把当前验收条件关联到模块约定、原工作线程和成果。启用会建立交付记录，保留已有任务。'),
      h('button', { className: 'pw-primary', disabled: busy, onClick: () => mutate('initialize', {}, view) }, '启用本项目交付管理')) : h(React.Fragment, null,
      h('p', { role: 'status' }, `${view.summary.accepted}/${view.summary.criteria} 项当前条件已验收 · ${view.summary.recheck} 份成果待复核 · ${view.summary.complete ? '当前条件均已通过人工验收' : '整体尚待交付验收'}`),
      h('details', { open: true }, h('summary', null, `交付缺口（${view.gaps.length}）`), view.gaps.length
        ? h('ul', null, ...view.gaps.map((g, i) => h('li', { key: i }, g.text))) : h('p', null, '当前已登记条件没有未处理缺口。')),
      h(DeliveryGraph, { graph: view.graph, selected, onSelect: setSelected }),
      node && h('article', { className: 'pw-card', 'aria-label': '交付节点详情' },
        h('strong', null, `${deliveryNames[node.kind]} · ${node.title}`), h('p', null, `当前状态：${status(node.status)}`),
        work && h(React.Fragment, null, h('p', { className: 'pw-summary' }, `输入：${work.input}\n输出：${work.output}\n完成要求：${work.done}\n负责人：${work.owner || '未说明'}`),
          h('div', { className: 'pw-bar' }, ...work.threadIds.map(id => h('button', { key: id, onClick: () => openThread(id) }, `打开原线程：${project.threads.find(t => t.id === id)?.title || id}`)), h('button', { onClick: () => open('package-save', work) }, '编辑此工作包')), history(work)),
        artifact && h(React.Fragment, null, h('p', { className: 'pw-summary' }, artifact.summary), h('p', { className: 'pw-summary' }, `成果位置：${artifact.reference}\n核对证据：${artifact.evidence}`),
          h('p', { className: 'pw-muted' }, artifact.reviewReason || artifact.sourceNote), artifact.threadId && h('button', { onClick: () => openThread(artifact.threadId) }, '打开成果原线程'), history(artifact)),
        criterion && h(React.Fragment, null, h('p', null, `条件版本 ${criterion.version} · ${criterion.requiredWorkIds.length} 个负责模块`),
          criterion.lastAcceptance && h('p', { className: 'pw-summary' }, `最近人工结论：${criterion.lastAcceptance.decision === 'accept' ? '通过' : '退回'}\n依据：${criterion.lastAcceptance.note}\n时间：${criterion.lastAcceptance.at}`), history(criterion)),
        thread && h(React.Fragment, null, h('p', { className: 'pw-summary' }, thread.summary || thread.task), h('p', { className: 'pw-muted' }, `原任务运行状态：${thread.runtimeState || 'unknown'}；工作轮次 ${thread.generation}`), h('button', { onClick: () => openThread(thread.id) }, '打开此原线程'))),
      h('div', { className: 'pw-bar' }, h('strong', { style: { flex: 1 } }, '验收条件'), h('button', { disabled: busy, onClick: () => open('criterion-save', { text: '' }) }, '新增验收条件')),
      ...view.criteria.filter(c => c.active).map(c => h('article', { className: 'pw-card', key: c.id },
        h('strong', null, c.text), h('small', null, `版本 ${c.version} · ${status(c.status)}`),
        h('div', { className: 'pw-bar' }, h('button', { onClick: () => open('criterion-save', { id: c.id, text: c.text }) }, '修改条件'),
          h('button', { onClick: () => acceptance(c) }, '核对并记录验收'), h('button', { onClick: () => setSelected(`${project.id}/criterion/${c.id}`) }, '在图中定位')))),
      h('div', { className: 'pw-bar' }, h('strong', { style: { flex: 1 } }, '模块工作包'), h('button', { disabled: busy, onClick: newPackage }, '新增模块工作包')),
      ...view.packages.map(w => h('article', { className: 'pw-card', key: w.id },
        h('strong', null, w.title), h('p', { className: 'pw-summary' }, `输入：${w.input}\n输出：${w.output}\n完成要求：${w.done}`),
        h('small', null, `版本 ${w.version} · ${w.threadIds.length} 条原线程 · ${w.dependsOn.length} 个上游模块`),
        h('div', { className: 'pw-bar' }, h('button', { onClick: () => open('package-save', w) }, '编辑工作包'), h('button', { onClick: () => newArtifact(w) }, '登记成果'),
          h('button', { onClick: () => setSelected(`${project.id}/package/${w.id}`) }, '在图中定位'), ...w.threadIds.map(id => h('button', { key: id, onClick: () => openThread(id) }, `原线程：${project.threads.find(t => t.id === id)?.title || id}`))))),
      h('strong', null, '成果与复核'),
      !view.artifacts.length && h('p', { className: 'pw-muted' }, '尚未登记成果。在线程有汇报后，选择对应工作包登记。'),
      ...view.artifacts.map(a => h('article', { className: 'pw-card', key: a.id }, h('strong', null, a.title), h('small', null, `版本 ${a.version} · ${a.stale ? '待复核' : '已登记，适用性未发现变化'}`),
        h('p', { className: 'pw-summary' }, a.reference), a.stale && h('p', { className: 'pw-error' }, a.reviewReason),
        h('div', { className: 'pw-bar' }, h('button', { onClick: () => open('artifact-save', a) }, '补充成果版本'),
          h('button', { onClick: () => open('artifact-review', { id: a.id, decision: 'reuse', note: '' }) }, '记录复核结论'),
          h('button', { onClick: () => setSelected(`${project.id}/artifact/${a.id}`) }, '查看成果依据')))),
      h('details', null, h('summary', null, `人工验收记录（${view.acceptances.length}）`), ...view.acceptances.slice().reverse().map(a => h('p', { className: 'pw-summary', key: a.id },
        `${view.criteria.find(c => c.id === a.criterionId)?.text || '历史条件'} · 条件版本 ${a.criterionVersion} · ${a.decision === 'accept' ? '通过' : '退回'}\n${a.note}\n${a.artifacts.map(x => `${view.artifacts.find(v => v.id === x.id)?.title || x.id} v${x.version}`).join('、')}\n${a.at}`))),
      form && h('form', { ref: formElement, className: 'pw-card', 'aria-label': '编辑交付记录', onSubmit: e => { e.preventDefault(); void mutate(form.type, form.data); } },
        h('h3', null, ({ 'criterion-save': '编辑验收条件', 'package-save': '编辑模块工作包', 'artifact-save': '登记成果版本', 'artifact-review': '复核成果', acceptance: '人工验收' })[form.type]),
        form.sourceToken !== view.sourceToken && h('div', { className: 'pw-error' }, '项目依据已更新，草稿已保留。请先核对新记录。', h('button', { type: 'button', onClick: () => setForm(f => ({ ...f, revision: view.revision, sourceToken: view.sourceToken })) }, '已核对，按最新依据继续编辑')),
        form.type === 'criterion-save' && field('条件内容', 'text', true),
        form.type === 'package-save' && h(React.Fragment, null, field('工作包名称', 'title'), field('输入约定', 'input', true), field('输出约定', 'output', true), field('完成要求', 'done', true), field('负责人说明', 'owner', false, true),
          pick('负责的验收条件', view.criteria.filter(c => c.active), 'criterionIds', 'text'), pick('关联原工作线程', project.threads, 'threadIds'),
          pick('需要输入的上游模块', view.packages.filter(w => w.id !== form.data.id), 'dependsOn'), pick('适用的有效决定', (project.continuity?.decisions || []).filter(d => d.status === 'active'), 'decisionIds', 'text')),
        form.type === 'artifact-save' && h(React.Fragment, null, field('成果名称', 'title'), field('成果说明', 'summary', true), field('成果位置或原会话引用', 'reference', true), field('核对证据与限制', 'evidence', true),
          h('label', null, '来源线程', h('select', { value: form.data.threadId || '', onChange: e => edit('threadId', e.target.value) }, h('option', { value: '' }, '人工登记，无来源线程'),
            ...project.threads.filter(t => view.packages.find(w => w.id === form.data.workId)?.threadIds.includes(t.id)).map(t => h('option', { key: t.id, value: t.id }, t.title)))),
          h('p', { className: 'pw-muted' }, '登记不会读取或修改所填文件。请写清实际检查与尚未验证的部分。')),
        form.type === 'artifact-review' && h(React.Fragment, null, h('label', null, '复核结论', h('select', { value: form.data.decision, onChange: e => edit('decision', e.target.value) }, h('option', { value: 'reuse' }, '已核对，可按当前依据沿用'), h('option', { value: 'revise' }, '需要补充或返工'))), field('复核依据', 'note', true)),
        form.type === 'acceptance' && h(React.Fragment, null, h('p', { className: 'pw-summary' }, view.criteria.find(c => c.id === form.data.criterionId)?.text),
          pick('已核对的成果版本', view.artifacts.filter(a => view.packages.find(w => w.id === a.workId)?.criterionIds.includes(form.data.criterionId)).map(a => ({ ...a, title: `${a.title} v${a.version}`, disabled: a.stale })), 'artifactIds'),
          h('label', null, '人工结论', h('select', { value: form.data.decision, onChange: e => edit('decision', e.target.value) }, h('option', { value: 'accept' }, '通过当前条件'), h('option', { value: 'reject' }, '退回，仍需补充'))), field('验收依据', 'note', true),
          h('label', { style: { display: 'flex', alignItems: 'center' } }, h('input', { type: 'checkbox', style: { width: 'auto' }, checked: form.data.confirmed, onChange: e => edit('confirmed', e.target.checked) }), '我已核对所选成果，明确记录本次人工结论')),
        h('div', { className: 'pw-bar' }, h('button', { type: 'submit', className: 'pw-primary', disabled: busy || form.sourceToken !== view.sourceToken || (form.type === 'acceptance' && !form.data.confirmed) }, busy ? '正在保存…' : '保存交付记录'),
          h('button', { type: 'button', disabled: busy, onClick: () => setForm(null) }, '取消编辑'))),
      h('small', null, `交付记录版本 ${view.revision}。运行状态、成果适用性与人工验收分别核对。`)));
}
