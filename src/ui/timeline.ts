import { axisMonths, shortDate } from '../dates';
import type { Metrics, TaskView } from '../model';
import { catColor, esc, legendStatuses, pct, statusIcon } from './shared';

/** Marker diameter grows with the task weight (area ∝ weight). */
const markerSize = (w: number | null) => Math.round(12 + 3 * Math.sqrt(w ?? 1));

export function timeline(m: Metrics): string {
  const days = m.tasks.flatMap((t) => [t.dueDay, t.doneDay]).filter((d): d is number => d !== null);
  const lo = Math.min(m.start, ...days);
  const hi = Math.max(m.end, m.today, ...days) + 3;
  const pos = (d: number) => `${(((d - lo) / (hi - lo)) * 100).toFixed(3)}%`;

  const months = axisMonths(lo, hi);
  const bg =
    months.filter((t) => t.line).map((t) => `<i class="tl-month" style="left:${pos(t.day)}"></i>`).join('') +
    m.milestones.map((ms) => `<i class="tl-ms" style="left:${pos(ms.day)}"></i>`).join('') +
    `<i class="tl-today" style="left:${pos(m.today)}"></i>`;

  const axis = `
    <div class="tl-axis">
      ${months.map((t) => `<span class="tl-mlabel" style="left:${pos(t.day)}">${t.label}</span>`).join('')}
      ${m.milestones.map((ms) => `<span class="tl-msmark ${ms.day < m.today ? 'is-past' : ''}" style="left:${pos(ms.day)}" title="${esc(ms.label)} · ${shortDate(ms.day)}">${ms.index + 1}</span>`).join('')}
      <span class="tl-todaylabel" style="left:${pos(m.today)}">Aujourd’hui</span>
      ${bg}
    </div>`;

  const marks = (t: TaskView): string => {
    const size = markerSize(t.weight);
    const icon = (d: number) =>
      `<span class="tl-mark" style="left:${pos(d)};width:${size}px;height:${size}px">${statusIcon(t.status, size)}</span>`;
    if (t.dueDay === null) return t.doneDay !== null ? icon(t.doneDay) : '<span class="tl-unplanned">Non planifiée</span>';
    if (t.doneDay !== null) {
      const [a, b] = [Math.min(t.dueDay, t.doneDay), Math.max(t.dueDay, t.doneDay)];
      const cls = t.doneDay > t.dueDay ? 'is-late' : 'is-early';
      return `${t.doneDay !== t.dueDay ? `<span class="tl-link ${cls}" style="left:${pos(a)};right:calc(100% - ${pos(b)})"></span>` : ''}
        <span class="tl-due" style="left:${pos(t.dueDay)}"></span>${icon(t.doneDay)}`;
    }
    if (t.status === 'late') {
      return `<span class="tl-link is-overdue" style="left:${pos(t.dueDay)};right:calc(100% - ${pos(m.today)})"></span>
        <span class="tl-overdue" style="left:${pos(m.today)}">+${t.slip} j</span>${icon(t.dueDay)}`;
    }
    return icon(t.dueDay);
  };

  const row = (t: TaskView) => `
    <div class="tl-row is-${t.status}" data-task="${t.id}" tabindex="0">
      <div class="tl-c tl-icon">${statusIcon(t.status, 16)}</div>
      <div class="tl-c tl-id">#${t.id}</div>
      <div class="tl-c tl-name"><span>${esc(t.name)}</span>${
        t.waitingOn.length && t.status !== 'done' ? `<small class="wait">attend ${t.waitingOn.map((p) => `#${p}`).join(', ')}</small>` : ''
      }</div>
      <div class="tl-c tl-weight">${t.weight ?? '—'}</div>
      <div class="tl-c tl-date">${t.dueDay !== null ? shortDate(t.dueDay) : '—'}</div>
      <div class="tl-c tl-track">${bg}${marks(t)}</div>
    </div>`;

  const groups = m.categories
    .map((c) => {
      const tasks = m.tasks
        .filter((t) => t.category === c.name)
        .sort((a, b) => (a.dueDay ?? Infinity) - (b.dueDay ?? Infinity) || a.id - b.id);
      return `
        <div class="tl-group">
          <div class="tl-ghead">
            <i class="swatch" style="background:${catColor(c.index)}"></i>
            <b>${esc(c.name)}</b>
            <span class="muted">${c.doneCount}/${c.count} terminées · ${pct(c.total ? (c.done / c.total) * 100 : 0)} du poids</span>
          </div>
          ${tasks.map(row).join('')}
        </div>`;
    })
    .join('');

  return `
    <section class="card card-tl">
      <div class="card-head">
        <div>
          <h2>Planning des tâches</h2>
          <p class="card-sub">Échéance de chaque tâche. La taille du repère indique son poids, le trait relie l’échéance à la date de réalisation.</p>
        </div>
        ${legendStatuses()}
      </div>
      <div class="tl">
        <div class="tl-row tl-header">
          <div class="tl-c tl-icon"></div>
          <div class="tl-c tl-id">#</div>
          <div class="tl-c tl-name">Tâche</div>
          <div class="tl-c tl-weight">Poids</div>
          <div class="tl-c tl-date">Échéance</div>
          <div class="tl-c tl-track">${axis}</div>
        </div>
        ${groups}
      </div>
    </section>`;
}
