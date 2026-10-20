import { axisMonths, longDate, shortDate } from '../dates';
import { valueAt, type Metrics, type Point } from '../model';
import { esc, pct, pts } from './shared';
import { hideTip, showTip } from './tooltip';

export function curveCard(m: Metrics): string {
  const ms = m.milestones
    .map((x) => `<li class="${x.day < m.today ? 'is-past' : ''}"><span class="ms-num">${x.index + 1}</span>${esc(x.label)}<span class="muted">${shortDate(x.day)}</span></li>`)
    .join('');
  return `
    <section class="card card-curve">
      <div class="card-head">
        <div>
          <h2>Courbe d’avancement</h2>
          <p class="card-sub">Part du poids total des tâches terminées, réel et prévu</p>
        </div>
        <ul class="legend">
          <li><i class="key-line key-actual"></i>Réel</li>
          <li><i class="key-line key-planned"></i>Prévu</li>
          <li><i class="key-today"></i>Aujourd’hui</li>
          <li><span class="ms-num">1</span>Jalon</li>
        </ul>
      </div>
      <div class="curve" id="curve"></div>
      <ol class="ms-list">${ms}</ol>
    </section>`;
}

const H = 320;
const M = { top: 34, right: 64, bottom: 30, left: 44 };

function stepPath(points: Point[], x: (d: number) => number, y: (v: number) => number, until: number): string {
  let d = `M${x(points[0].day)},${y(points[0].pct)}`;
  for (let i = 1; i < points.length; i++) {
    if (points[i].day > until) break;
    d += `H${x(points[i].day)}V${y(points[i].pct)}`;
  }
  return d + `H${x(until)}`;
}

export function drawCurve(el: HTMLElement, m: Metrics) {
  const W = Math.max(320, el.clientWidth);
  const pw = W - M.left - M.right;
  const ph = H - M.top - M.bottom;
  const span = m.end - m.start || 1;
  const x = (d: number) => M.left + ((Math.min(Math.max(d, m.start), m.end) - m.start) / span) * pw;
  const y = (v: number) => M.top + (1 - v / 100) * ph;
  const today = Math.min(Math.max(m.today, m.start), m.end);
  const tx = x(today);

  const grid = [0, 25, 50, 75, 100]
    .map((v) => `<line class="grid" x1="${M.left}" x2="${M.left + pw}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${M.left - 8}" y="${y(v) + 4}" text-anchor="end">${v} %</text>`)
    .join('');

  // Skip a month label when it would collide with the previous one.
  let nextFree = -Infinity;
  const monthTicks = axisMonths(m.start, m.end)
    .map((t) => {
      const px = x(t.day);
      const show = px >= nextFree;
      if (show) nextFree = px + t.label.length * 6.2 + 12;
      const line = t.line ? `<line class="grid grid-v" x1="${px}" x2="${px}" y1="${M.top}" y2="${M.top + ph}"/>` : '';
      return `${line}${show ? `<text class="tick" x="${px + 4}" y="${H - 10}">${t.label}</text>` : ''}`;
    })
    .join('');

  const milestones = m.milestones
    .map((ms) => {
      const px = x(ms.day);
      const past = ms.day < m.today;
      return `<g class="ms ${past ? 'is-past' : ''}">
        <line class="ms-line" x1="${px}" x2="${px}" y1="${M.top - 6}" y2="${M.top + ph}"/>
        <rect x="${px - 8}" y="${M.top - 24}" width="16" height="16" rx="3" transform="rotate(45 ${px} ${M.top - 16})"/>
        <text x="${px}" y="${M.top - 12}" text-anchor="middle">${ms.index + 1}</text>
      </g>`;
    })
    .join('');

  const plannedD = stepPath(m.planned, x, y, m.end);
  const actualD = stepPath(m.actual, x, y, today);
  const areaD = `${actualD}V${y(0)}H${x(m.start)}Z`;

  const ya = y(m.actualPct);
  const yp = y(m.plannedPct);
  const gap = Math.round(m.gap);
  const bracket = Math.abs(gap) >= 1
    ? `<line class="gap-line ${gap < 0 ? 'neg' : 'pos'}" x1="${tx}" x2="${tx}" y1="${yp}" y2="${ya}"/>`
    : '';

  // End labels on the right of "today"; merged when the two values sit too close.
  const lx = tx + 10;
  const anchorEnd = lx + 90 > W;
  const lxx = anchorEnd ? tx - 10 : lx;
  const anchor = anchorEnd ? 'end' : 'start';
  let labels: string;
  if (Math.abs(ya - yp) < 30) {
    const yy = Math.min(ya, yp) - 8;
    labels = `<text class="end-label" x="${lxx}" y="${yy}" text-anchor="${anchor}"><tspan class="strong">${pct(m.actualPct)}</tspan> réel · prévu ${pct(m.plannedPct)}</text>`;
  } else {
    labels = `
      <text class="end-label" x="${lxx}" y="${ya + 4}" text-anchor="${anchor}"><tspan class="strong">${pct(m.actualPct)}</tspan> réel</text>
      <text class="end-label" x="${lxx}" y="${yp + 4}" text-anchor="${anchor}">${pct(m.plannedPct)} prévu</text>
      ${gap ? `<text class="gap-label ${gap < 0 ? 'neg' : 'pos'}" x="${lxx}" y="${(ya + yp) / 2 + 4}" text-anchor="${anchor}">${pts(m.gap)}</text>` : ''}`;
  }

  el.innerHTML = `
    <svg width="${W}" height="${H}" role="img" aria-label="Courbe d’avancement : ${pct(m.actualPct)} réalisé, ${pct(m.plannedPct)} prévu à date">
      ${grid}${monthTicks}
      <line class="axis" x1="${M.left}" x2="${M.left + pw}" y1="${y(0)}" y2="${y(0)}"/>
      ${milestones}
      <path class="area-actual" d="${areaD}"/>
      <path class="line-planned" d="${plannedD}"/>
      <path class="line-actual" d="${actualD}"/>
      <line class="today-line" x1="${tx}" x2="${tx}" y1="${M.top - 4}" y2="${M.top + ph}"/>
      ${bracket}
      <circle class="dot-planned" cx="${tx}" cy="${yp}" r="4"/>
      <circle class="dot-actual" cx="${tx}" cy="${ya}" r="5"/>
      ${labels}
      <g class="hover" visibility="hidden">
        <line class="hover-line" y1="${M.top}" y2="${M.top + ph}"/>
        <circle class="dot-planned" r="4"/>
        <circle class="dot-actual" r="5"/>
      </g>
      <rect class="curve-hit" x="${M.left}" y="${M.top}" width="${pw}" height="${ph}" fill="transparent"/>
    </svg>`;

  const svg = el.querySelector('svg')!;
  const hover = svg.querySelector<SVGGElement>('.hover')!;
  const hit = svg.querySelector<SVGRectElement>('.curve-hit')!;
  const [hl, hp, ha] = [hover.children[0], hover.children[1], hover.children[2]] as SVGElement[];

  hit.addEventListener('pointermove', (e) => {
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const day = Math.round(m.start + ((px - M.left) / pw) * span);
    const dx = x(day);
    const p = valueAt(m.planned, day);
    hover.setAttribute('visibility', 'visible');
    hl.setAttribute('x1', `${dx}`);
    hl.setAttribute('x2', `${dx}`);
    hp.setAttribute('cx', `${dx}`);
    hp.setAttribute('cy', `${y(p)}`);
    let body = `<div class="tip-title">${longDate(day)}</div><dl><dt><i class="key-line key-planned"></i>Prévu</dt><dd>${pct(p)}</dd>`;
    if (day <= m.today) {
      const a = valueAt(m.actual, day);
      ha.style.display = '';
      ha.setAttribute('cx', `${dx}`);
      ha.setAttribute('cy', `${y(a)}`);
      body += `<dt><i class="key-line key-actual"></i>Réel</dt><dd>${pct(a)}</dd><dt>Écart</dt><dd>${pts(a - p)}</dd>`;
    } else {
      ha.style.display = 'none';
    }
    showTip(body + '</dl>', e.clientX, e.clientY);
  });
  hit.addEventListener('pointerleave', () => {
    hover.setAttribute('visibility', 'hidden');
    hideTip();
  });
}
