import { axisMonths, shortDate } from '../dates';
import { isDone, type Metrics, type TaskView } from '../model';
import { catColor, esc, legendStatuses, pct, slipPill, statusIcon } from './shared';

/** Diameter of the "finished" marker drawn on the bars. */
const MARK = 16;

export function timeline(m: Metrics): string {
  const days = m.tasks.flatMap((t) => [t.startDay, t.dueDay, t.doneDay]).filter((d): d is number => d !== null);
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

  const span = (a: number, b: number) => `left:${pos(a)};right:calc(100% - ${pos(b)})`;

  const marks = (t: TaskView): string => {
    const icon = (d: number) => `<span class="tl-mark" style="left:${pos(d)}">${statusIcon(t.status, MARK)}</span>`;
    if (t.dueDay === null) return t.doneDay !== null ? icon(t.doneDay) : '<span class="tl-unplanned">Non planifiée</span>';
    const bar = `<span class="tl-bar is-${t.status}" style="${span(t.startDay!, t.dueDay)}"></span>`;
    if (t.doneDay !== null) {
      const over = t.doneDay > t.dueDay ? `<span class="tl-link is-late" style="${span(t.dueDay, t.doneDay)}"></span>` : '';
      return `${bar}${over}${icon(t.doneDay)}`;
    }
    if (t.status === 'late') {
      return `${bar}<span class="tl-link is-overdue" style="${span(t.dueDay, m.today)}"></span>
        <span class="tl-overdue" style="left:${pos(m.today)}">+${t.slip} j</span>`;
    }
    return bar;
  };

  const row = (t: TaskView) => `
    <div class="tl-row is-${t.status}" data-task="${t.id}" tabindex="0">
      <div class="tl-c tl-icon">${statusIcon(t.status, 16)}</div>
      <div class="tl-c tl-id">#${t.id}</div>
      <div class="tl-c tl-name"><span>${esc(t.name)}</span>${
        t.waitingOn.length && !isDone(t) ? `<small class="wait">attend ${t.waitingOn.map((p) => `#${p}`).join(', ')}</small>` : ''
      }</div>
      <div class="tl-c tl-weight">${t.weight ?? '—'}</div>
      <div class="tl-c tl-date">${t.dueDay !== null ? shortDate(t.dueDay) : '—'}</div>
      <div class="tl-c tl-slip">${slipPill(t)}</div>
      <div class="tl-c tl-track">${bg}${marks(t)}</div>
    </div>`;

  const groups = m.categories
    .map((c) => {
      const tasks = m.tasks
        .filter((t) => t.category === c.name)
        .sort((a, b) => (a.startDay ?? Infinity) - (b.startDay ?? Infinity) || (a.dueDay ?? Infinity) - (b.dueDay ?? Infinity) || a.id - b.id);
      return `
        <div class="tl-group">
          <div class="tl-ghead">
            <i class="swatch" style="background:${catColor(c.index)}"></i>
            <b>${esc(c.name)}</b>
            <span class="muted">${c.doneCount}/${c.count} terminées${c.doneLateCount ? ` (dont ${c.doneLateCount} en retard)` : ''} · ${pct(c.total ? (c.done / c.total) * 100 : 0)} du poids</span>
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
          <p class="card-sub">Chaque barre va du début estimé (échéance de la dernière tâche dont elle dépend, sinon début du projet) jusqu’à l’échéance. Barre pleine : terminée ; le prolongement montre le retard. La colonne Écart donne les jours de retard (+) ou d’avance (−).</p>
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
          <div class="tl-c tl-slip">Écart</div>
          <div class="tl-c tl-track">${axis}</div>
        </div>
        ${groups}
      </div>
    </section>`;
}
