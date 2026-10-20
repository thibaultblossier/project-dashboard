import { shortDate } from '../dates';
import type { Metrics } from '../model';
import { layeredLayout } from './layout';
import { catColor, esc, legendStatuses, statusIcon } from './shared';

export function graphCard(m: Metrics): string {
  const legendCats = m.categories
    .map((c) => `<li><i class="swatch" style="background:${catColor(c.index)}"></i>${esc(c.name)}</li>`)
    .join('');
  return `
    <section class="card card-graph">
      <div class="card-head">
        <div>
          <h2>Enchaînement des tâches</h2>
          <p class="card-sub">Chaque tâche est placée sous celles dont elle dépend. Survolez une tâche pour voir sa chaîne.</p>
        </div>
        <div class="graph-legends">
          ${legendStatuses()}
          <ul class="legend">${legendCats}</ul>
        </div>
      </div>
      <div class="graph" id="graph"></div>
    </section>`;
}

const NODE_H = 46;
const GAP_X = 14;
const GAP_Y = 34;
const PAD = 4;

export function drawGraph(el: HTMLElement, m: Metrics) {
  const linked = m.tasks.filter((t) => t.parents.length || t.children.length);
  const isolated = m.tasks.filter((t) => !t.parents.length && !t.children.length);
  const cmp = (a: number, b: number) => {
    const x = m.byId.get(a)!, y = m.byId.get(b)!;
    return x.categoryIndex - y.categoryIndex || (x.dueDay ?? Infinity) - (y.dueDay ?? Infinity) || a - b;
  };

  const lay = layeredLayout(linked.map((t) => t.id), (id) => m.byId.get(id)!.parents, {
    width: Math.max(320, el.clientWidth),
    minNodeW: 132,
    maxNodeW: 220,
    dummyW: 8,
    gap: GAP_X,
    pad: PAD,
    compare: cmp,
  });
  const { nodeW, width: svgW } = lay;
  const yOf = (layer: number) => PAD + layer * (NODE_H + GAP_Y);

  // Tasks without any dependency sit in their own wrapped rows at the bottom.
  const place = new Map<number, { x: number; y: number }>();
  for (const [id, p] of lay.nodes) place.set(id, { x: p.x - nodeW / 2, y: yOf(p.layer) });
  const isoTop = yOf(lay.layerCount) + 26;
  const perRow = Math.max(1, Math.floor((svgW - 2 * PAD + GAP_X) / (nodeW + GAP_X)));
  [...isolated].sort((a, b) => cmp(a.id, b.id)).forEach((t, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, isolated.length - row * perRow);
    const x0 = (svgW - (inRow * nodeW + (inRow - 1) * GAP_X)) / 2;
    place.set(t.id, { x: x0 + (i % perRow) * (nodeW + GAP_X), y: isoTop + row * (NODE_H + 14) });
  });
  const isoRows = Math.ceil(isolated.length / perRow);
  const H = (isolated.length ? isoTop + isoRows * (NODE_H + 14) - 14 : yOf(lay.layerCount - 1) + NODE_H) + PAD + 4;

  const edges = lay.edges
    .map(({ from, to, via }) => {
      const parent = m.byId.get(from)!;
      const child = m.byId.get(to)!;
      const a = place.get(from)!, b = place.get(to)!;
      const pts = [
        { x: a.x + nodeW / 2, top: a.y, bottom: a.y + NODE_H },
        ...via.map((v) => ({ x: v.x, top: yOf(v.layer), bottom: yOf(v.layer) + NODE_H })),
        { x: b.x + nodeW / 2, top: b.y - 2, bottom: b.y + NODE_H },
      ];
      let d = `M${pts[0].x},${pts[0].bottom}`;
      for (let i = 1; i < pts.length; i++) {
        const p = pts[i - 1], q = pts[i];
        const my = (p.bottom + q.top) / 2;
        d += ` C${p.x},${my} ${q.x},${my} ${q.x},${q.top}`;
        if (i < pts.length - 1) d += ` L${q.x},${q.bottom}`;
      }
      const blocking = parent.status === 'late' && child.status !== 'done';
      const cls = parent.status === 'done' ? 'is-done' : blocking ? 'is-blocking' : '';
      return `<path class="edge ${cls}" data-from="${from}" data-to="${to}" d="${d}" marker-end="url(#arrow${blocking ? '-b' : ''})"/>`;
    })
    .join('');

  const maxChars = Math.floor((nodeW - 22) / 6.4);
  const trunc = (s: string) => (s.length > maxChars ? s.slice(0, maxChars - 1).trimEnd() + '…' : s);

  const nodes = [...place]
    .map(([id, { x, y }]) => {
      const t = m.byId.get(id)!;
      return `
      <g class="node is-${t.status}" data-task="${t.id}" tabindex="0" transform="translate(${x},${y})">
        <rect class="node-bg" width="${nodeW}" height="${NODE_H}" rx="8"/>
        <rect class="node-cat" x="0" y="8" width="3" height="${NODE_H - 16}" rx="1.5" fill="${catColor(t.categoryIndex)}"/>
        <g transform="translate(10,7)">${statusIcon(t.status, 14)}</g>
        <text class="node-id" x="30" y="19">#${t.id}</text>
        <text class="node-date" x="${nodeW - 10}" y="19" text-anchor="end">${t.dueDay !== null ? shortDate(t.dueDay) : 'non planifiée'}</text>
        <text class="node-name" x="10" y="37">${esc(trunc(t.name))}</text>
      </g>`;
    })
    .join('');

  const isoLabel = isolated.length
    ? `<line class="graph-sep" x1="${PAD}" x2="${svgW - PAD}" y1="${isoTop - 30}" y2="${isoTop - 30}"/>
       <text class="graph-label" x="${PAD}" y="${isoTop - 10}">Sans dépendance</text>`
    : '';

  el.innerHTML = `
    <svg width="${svgW}" height="${H}" role="img" aria-label="Graphe des dépendances entre tâches">
      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0.5 L8,4 L0,7.5z" class="arrow"/></marker>
        <marker id="arrow-b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0.5 L8,4 L0,7.5z" class="arrow arrow-b"/></marker>
      </defs>
      ${isoLabel}
      <g class="edges">${edges}</g>
      <g class="nodes">${nodes}</g>
    </svg>`;

  // Hover / focus: highlight every ancestor and descendant of the task.
  const svg = el.querySelector('svg')!;
  const chain = (id: number) => {
    const seen = new Set([id]);
    const walk = (k: number, dir: 'parents' | 'children') => {
      for (const n of m.byId.get(k)![dir]) if (!seen.has(n)) { seen.add(n); walk(n, dir); }
    };
    walk(id, 'parents');
    walk(id, 'children');
    return seen;
  };
  const clear = () => {
    svg.classList.remove('has-focus');
    svg.querySelectorAll('.hl').forEach((n) => n.classList.remove('hl'));
  };
  const focus = (id: number) => {
    clear();
    const all = chain(id);
    svg.classList.add('has-focus');
    svg.querySelectorAll<SVGGElement>('.node').forEach((n) => all.has(Number(n.dataset.task)) && n.classList.add('hl'));
    svg.querySelectorAll<SVGPathElement>('.edge').forEach((e) => {
      if (all.has(Number(e.dataset.from)) && all.has(Number(e.dataset.to))) e.classList.add('hl');
    });
  };
  svg.querySelectorAll<SVGGElement>('.node').forEach((n) => {
    const id = Number(n.dataset.task);
    n.addEventListener('pointerenter', () => focus(id));
    n.addEventListener('focus', () => focus(id));
    n.addEventListener('pointerleave', clear);
    n.addEventListener('blur', clear);
  });
}
