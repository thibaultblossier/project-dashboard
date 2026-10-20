import { relative, shortDate } from '../dates';
import type { Metrics, Status, TaskView } from '../model';
import { esc, meter, pct, pts, statusIcon } from './shared';

const MAX_LISTED = 4;

function names(tasks: TaskView[], none: string): string {
  if (!tasks.length) return `<p class="kpi-sub">${none}</p>`;
  const shown = tasks.slice(0, MAX_LISTED);
  const more = tasks.length - shown.length;
  return `<ul class="kpi-list">${shown
    .map((t) => `<li data-task="${t.id}" tabindex="0"><b>#${t.id}</b><span>${esc(t.name)}</span></li>`)
    .join('')}${more > 0 ? `<li class="muted">et ${more} autre${more > 1 ? 's' : ''} (voir À surveiller)</li>` : ''}</ul>`;
}

function gapBadge(gap: number): string {
  const r = Math.round(gap);
  let s: Status = 'done';
  let text = 'Conforme au plan';
  if (r <= -1) { s = r <= -5 ? 'late' : 'soon'; text = 'En retard sur le plan'; }
  else if (r >= 1) text = 'En avance sur le plan';
  return `<span class="badge badge-${s}">${statusIcon(s, 14)}<b>${pts(gap)}</b> ${text}</span>`;
}

export function kpis(m: Metrics): string {
  const late = m.tasks.filter((t) => t.status === 'late').sort((a, b) => a.dueDay! - b.dueDay!);
  const soon = m.tasks.filter((t) => t.status === 'soon').sort((a, b) => a.dueDay! - b.dueDay!);
  const done = m.counts.done;
  const total = m.tasks.length;
  const ms = m.nextMilestone;
  const daysLeft = Math.max(0, m.end - m.today);

  return `
    <section class="kpis" aria-label="Indicateurs clés">
      <article class="kpi kpi-hero">
        <h2>Avancement réel</h2>
        <div class="hero-row">
          <div class="hero-value">${pct(m.actualPct)}</div>
          <div class="hero-side">
            ${gapBadge(m.gap)}
            <div class="hero-planned">Prévu à date : <b>${pct(m.plannedPct)}</b></div>
          </div>
        </div>
        ${meter(m.actualPct, m.plannedPct, 'meter-lg')}
        <div class="meter-legend"><span><i class="key-fill"></i>Réalisé</span><span><i class="key-tick"></i>Prévu à date</span></div>
      </article>

      <article class="kpi">
        <h2>Tâches terminées</h2>
        <div class="kpi-value">${done}<small> / ${total}</small></div>
        ${meter(total ? (done / total) * 100 : 0, undefined, 'meter-good')}
        <p class="kpi-sub">${m.counts.unplanned ? `dont ${m.counts.unplanned} non planifiée${m.counts.unplanned > 1 ? 's' : ''}` : 'toutes planifiées'}</p>
      </article>

      <article class="kpi ${late.length ? 'kpi-alert' : ''}">
        <h2>${statusIcon('late', 14)} En retard</h2>
        <div class="kpi-value">${late.length}</div>
        ${names(late, 'Aucune tâche en retard')}
      </article>

      <article class="kpi">
        <h2>${statusIcon('soon', 14)} Échéance ≤ 7 jours</h2>
        <div class="kpi-value">${soon.length}</div>
        ${names(soon, 'Rien à rendre cette semaine')}
      </article>

      <article class="kpi">
        <h2>Prochain jalon</h2>
        ${ms
          ? `<div class="kpi-value">${relative(ms.day, m.today)}</div>
             <div class="kpi-ms"><span class="ms-num">${ms.index + 1}</span><div><b>${esc(ms.label)}</b><span>${shortDate(ms.day)}</span></div></div>`
          : '<div class="kpi-value">—</div><p class="kpi-sub">Tous les jalons sont passés</p>'}
      </article>

      <article class="kpi">
        <h2>Temps écoulé</h2>
        <div class="kpi-value">${pct(m.elapsedPct)}</div>
        ${meter(m.elapsedPct, undefined, 'meter-muted')}
        <p class="kpi-sub">${daysLeft} jours restants · fin ${shortDate(m.end)}</p>
      </article>
    </section>`;
}
