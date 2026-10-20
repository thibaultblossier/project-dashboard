import { relative, shortDate } from '../dates';
import type { Metrics, TaskView } from '../model';
import { STATUS_LABEL, catColor, esc, statusIcon } from './shared';

// One floating tooltip for every element carrying `data-task="<id>"`.
// It only repeats what is already visible on the page, with more detail.

let tip: HTMLDivElement | null = null;
let metrics: Metrics | null = null;

function ensureTip(): HTMLDivElement {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
  }
  return tip;
}

function ref(m: Metrics, id: number): string {
  const t = m.byId.get(id);
  return t ? `${statusIcon(t.status, 12)} <b>#${id}</b> ${esc(t.name)}` : `#${id}`;
}

export function taskCard(t: TaskView, m: Metrics): string {
  const rows: string[] = [];
  if (t.dueDay !== null) rows.push(`<dt>Échéance</dt><dd>${shortDate(t.dueDay)} · ${relative(t.dueDay, m.today)}</dd>`);
  if (t.doneDay !== null) {
    const s = t.slip > 0 ? ` · ${t.slip} j de retard` : t.slip < 0 ? ` · ${-t.slip} j d’avance` : ' · à l’heure';
    rows.push(`<dt>Terminée</dt><dd>${shortDate(t.doneDay)}${t.dueDay !== null ? s : ''}</dd>`);
  }
  rows.push(`<dt>Poids</dt><dd>${t.weight ?? '—'}${t.weight && m.totalWeight ? ` · ${((t.weight / m.totalWeight) * 100).toFixed(1).replace('.', ',')} % du projet` : ''}</dd>`);
  const deps = t.parents.length ? `<div class="tip-deps"><span>Dépend de</span>${t.parents.map((p) => `<div>${ref(m, p)}</div>`).join('')}</div>` : '';
  const next = t.children.length ? `<div class="tip-deps"><span>Débloque</span>${t.children.map((c) => `<div>${ref(m, c)}</div>`).join('')}</div>` : '';
  return `
    <div class="tip-head">${statusIcon(t.status, 14)}<span>${STATUS_LABEL[t.status]}</span>
      <span class="tip-cat"><i style="background:${catColor(t.categoryIndex)}"></i>${esc(t.category)}</span></div>
    <div class="tip-title"><b>#${t.id}</b> ${esc(t.name)}</div>
    ${t.description ? `<p class="tip-desc">${esc(t.description)}</p>` : ''}
    <dl>${rows.join('')}</dl>${deps}${next}`;
}

function place(el: HTMLElement, x: number, y: number) {
  const pad = 14;
  const r = el.getBoundingClientRect();
  let left = x + pad;
  let top = y + pad;
  if (left + r.width > innerWidth - 8) left = x - r.width - pad;
  if (top + r.height > innerHeight - 8) top = y - r.height - pad;
  el.style.left = `${Math.max(8, left)}px`;
  el.style.top = `${Math.max(8, top)}px`;
}

export function showTip(html: string, x: number, y: number) {
  const el = ensureTip();
  el.innerHTML = html;
  el.classList.add('show');
  place(el, x, y);
}

export function hideTip() {
  tip?.classList.remove('show');
}

export function setTooltipMetrics(m: Metrics) {
  metrics = m;
}

/** Installs the delegated task tooltip once. */
export function installTaskTooltips() {
  const target = (e: Event) => (e.target as Element | null)?.closest?.('[data-task]') as HTMLElement | null;
  const show = (el: HTMLElement, x: number, y: number) => {
    const t = metrics?.byId.get(Number(el.dataset.task));
    if (t && metrics) showTip(taskCard(t, metrics), x, y);
  };
  document.addEventListener('pointermove', (e) => {
    const el = target(e);
    if (el) show(el, e.clientX, e.clientY);
    else if (!(e.target as Element)?.closest?.('.curve-hit')) hideTip();
  });
  document.addEventListener('focusin', (e) => {
    const el = target(e);
    if (!el) return;
    const r = el.getBoundingClientRect();
    show(el, r.right, r.top);
  });
  document.addEventListener('focusout', hideTip);
  addEventListener('scroll', hideTip, { passive: true });
}
