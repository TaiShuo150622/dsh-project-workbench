const deliveryNames = { goal: '目标', criterion: '验收条件', package: '模块', thread: '原线程', artifact: '成果', acceptance: '人工验收', decision: '决定' };
const deliveryStatuses = { pending: '待验收', accepted: '已验收', rejected: '已退回', recheck: '待复核', retired: '已归档', active: '有效', superseded: '已替代', review: '待验收', completed: '线程已验收', running: '进行中', queued: '排队中', interrupted: '待恢复', waiting_user: '等待用户', failed: '失败', stopped: '已停止' };
function graphPositions(graph) {
  const columns = [['goal', 'decision'], ['criterion'], ['package'], ['thread'], ['artifact'], ['acceptance']];
  const positions = new Map(); let rows = 1;
  columns.forEach((kinds, column) => {
    const items = graph.nodes.filter(n => kinds.includes(n.kind)); rows = Math.max(rows, items.length);
    items.forEach((n, row) => positions.set(n.id, { x: 20 + column * 218, y: 44 + row * 112 }));
  });
  return { positions, width: 1310, height: Math.max(210, rows * 112 + 58), columns };
}
function graphImpact(graph, selected) {
  const found = new Set(selected ? [selected] : []), queue = [...found];
  for (let i = 0; i < queue.length; i++) for (const edge of graph.edges) {
    if (edge.from === queue[i] && edge.kind !== 'execution-dependency' && !found.has(edge.to)) { found.add(edge.to); queue.push(edge.to); }
  }
  return found;
}
function DeliveryGraph({ graph, selected, onSelect }) {
  const [filter, setFilter] = React.useState('all');
  const { positions, width, height, columns } = graphPositions(graph), impact = graphImpact(graph, selected);
  const visibleEdges = graph.edges.filter(e => filter === 'all' || (filter === 'dependencies'
    ? ['delivery-dependency', 'execution-dependency'].includes(e.kind) : ['output', 'evidence'].includes(e.kind)));
  const marker = `delivery-arrow-${graph.projectId}`;
  return h('section', { 'aria-label': '项目交付 DAG', style: { display: 'grid', gap: 10 } },
    h('div', { className: 'pw-bar' }, h('strong', null, '交付关系图'),
      h('select', { 'aria-label': '图关系类型', style: { width: 'auto' }, value: filter, onChange: e => setFilter(e.target.value) },
        h('option', { value: 'all' }, '全部关系'), h('option', { value: 'dependencies' }, '交付与启动依赖'), h('option', { value: 'evidence' }, '成果与证据')),
      selected && h('button', { onClick: () => onSelect(null) }, '取消选择')),
    h('p', { className: 'pw-muted' }, selected ? `高亮当前节点及 ${Math.max(0, impact.size - 1)} 个关联下游。点击节点查看依据与原线程。` : '从目标向右查看模块、原线程、成果和验收；点击节点查看下游。可横向滚动。'),
    h('div', { style: { overflow: 'auto', border: '1px solid #8884', borderRadius: 10, maxHeight: 580 }, tabIndex: 0, 'aria-label': '可滚动关系图' },
      h('div', { style: { position: 'relative', width, height } },
        ...columns.map((kinds, i) => h('strong', { key: i, style: { position: 'absolute', left: 20 + i * 218, top: 12, fontSize: 12, opacity: .65 } }, kinds.map(k => deliveryNames[k]).join(' / '))),
        h('svg', { width, height, 'aria-hidden': true, style: { position: 'absolute', inset: 0, pointerEvents: 'none' } },
          h('defs', null, h('marker', { id: marker, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, h('path', { d: 'M 0 0 L 10 5 L 0 10 z', fill: '#7d8c9b' }))),
          ...visibleEdges.map(e => {
            const a = positions.get(e.from), b = positions.get(e.to); if (!a || !b) return null;
            const sx = a.x + 180, sy = a.y + 43, tx = b.x, ty = b.y + 43;
            const path = a.x === b.x ? `M ${sx} ${sy} C ${sx + 32} ${sy}, ${sx + 32} ${ty}, ${sx} ${ty}` : `M ${sx} ${sy} C ${sx + 28} ${sy}, ${tx - 28} ${ty}, ${tx} ${ty}`;
            return h('path', { key: e.id, d: path, fill: 'none', stroke: selected && impact.has(e.from) ? '#3c6d59' : '#7d8c9b', strokeWidth: selected && impact.has(e.from) ? 2 : 1,
              strokeDasharray: e.kind === 'execution-dependency' ? '3 4' : e.kind === 'delivery-dependency' ? '7 4' : undefined,
              markerEnd: `url(#${marker})` }, h('title', null, e.label));
          })),
        ...graph.nodes.map(n => {
          const pos = positions.get(n.id); if (!pos) return null;
          return h('button', { key: n.id, type: 'button', 'aria-pressed': selected === n.id,
            'aria-label': `${deliveryNames[n.kind]}：${n.title}；${deliveryStatuses[n.status] || n.status}`,
            onClick: () => onSelect(n.id), style: { position: 'absolute', left: pos.x, top: pos.y, width: 180, height: 86, textAlign: 'left', display: 'grid', gap: 4,
              background: selected === n.id ? 'var(--bg-secondary,#e7eee9)' : 'var(--bg-primary,#fff)', color: 'var(--text-primary,#23312b)',
              border: impact.has(n.id) ? '2px solid #3c6d59' : '1px solid #8886', opacity: selected && !impact.has(n.id) ? .55 : 1 } },
            h('span', { style: { fontSize: 12, lineHeight: '18px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } }, n.title),
            h('small', null, deliveryStatuses[n.status] || n.status));
        }))),
    h('p', { className: 'pw-muted' }, '实线表示归属、执行或证据；长虚线为模块输入依赖，短虚线为已有线程启动前置。登记成果仍须人工核对。'));
}
