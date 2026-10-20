import { relative, shortDate } from '../dates';
import { WATCH_DAYS, type Metrics, type TaskView } from '../model';
import { catColor, esc, statusIcon } from './shared';

function item(t: TaskView, m: Metrics, when: 'due' | 'done'): string {
  const day = when === 'done' ? t.doneDay! : t.dueDay!;
  const waiting = t.waitingOn.length && when === 'due'
    ? `<span class="wait">attend ${t.waitingOn.map((p) => `#${p}`).join(', ')}</span>`
    : '';
  return `
    <li class="w-item" data-task="${t.id}" tabindex="0">
      ${statusIcon(t.status, 16)}
      <div class="w-body">
        <div class="w-name"><b>#${t.id}</b> ${esc(t.name)}</div>
        <div class="w-meta">
          <span><i class="swatch" style="background:${catColor(t.categoryIndex)}"></i>${esc(t.category)}</span>
          <span>poids ${t.weight ?? '—'}</span>
          ${waiting}
        </div>
      </div>
      <div class="w-when"><b>${shortDate(day)}</b><span>${relative(day, m.today)}</span></div>
    </li>`;
}

function column(title: string, tasks: TaskView[], m: Metrics, when: 'due' | 'done', empty: string, cls: string): string {
  return `
    <div class="w-col ${cls}">
      <h3>${title}<span class="count">${tasks.length}</span></h3>
      ${tasks.length ? `<ul>${tasks.map((t) => item(t, m, when)).join('')}</ul>` : `<p class="empty">${empty}</p>`}
    </div>`;
}

export function watch(m: Metrics): string {
  const late = m.tasks.filter((t) => t.status === 'late').sort((a, b) => a.dueDay! - b.dueDay!);
  const upcoming = m.tasks
    .filter((t) => (t.status === 'soon' || t.status === 'todo') && t.dueDay! - m.today <= WATCH_DAYS)
    .sort((a, b) => a.dueDay! - b.dueDay!);
  const recent = m.tasks
    .filter((t) => t.doneDay !== null && t.doneDay <= m.today && m.today - t.doneDay <= WATCH_DAYS)
    .sort((a, b) => b.doneDay! - a.doneDay!);
  return `
    <section class="card card-watch">
      <div class="card-head"><h2>À surveiller</h2><p class="card-sub">Retards, échéances des ${WATCH_DAYS} prochains jours et tâches terminées ces ${WATCH_DAYS} derniers jours</p></div>
      <div class="w-cols">
        ${column('En retard', late, m, 'due', 'Aucune tâche en retard', 'w-late')}
        ${column(`Prochaines échéances`, upcoming, m, 'due', 'Aucune échéance dans les 14 prochains jours', 'w-next')}
        ${column('Terminées récemment', recent, m, 'done', 'Aucune tâche terminée ces 14 derniers jours', 'w-done')}
      </div>
    </section>`;
}
