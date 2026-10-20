import type { Status } from '../model';

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ENTITIES[c]);

/** "34 %" with the French narrow no-break space. */
export const pct = (v: number) => `${Math.round(v)} %`;

/** "+3 pts" / "−7 pts" */
export function pts(v: number): string {
  const r = Math.round(v);
  if (r === 0) return '0 pt';
  return `${r > 0 ? '+' : '−'}${Math.abs(r)} pt${Math.abs(r) > 1 ? 's' : ''}`;
}

export const STATUS_ORDER: Status[] = ['done', 'late', 'soon', 'todo', 'unplanned'];

export const STATUS_LABEL: Record<Status, string> = {
  done: 'Terminée',
  late: 'En retard',
  soon: 'Échéance ≤ 7 j',
  todo: 'À venir',
  unplanned: 'Non planifiée',
};

export const catColor = (index: number) => `var(--cat-${index % 8})`;

/** Status glyph: filled disc with a white symbol, so state never relies on color alone. */
export function statusIcon(s: Status, size = 16): string {
  const c = `var(--st-${s})`;
  const glyph: Record<Status, string> = {
    done: `<circle cx="8" cy="8" r="8" fill="${c}"/><path d="M4.6 8.3l2.2 2.2 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
    late: `<circle cx="8" cy="8" r="8" fill="${c}"/><path d="M8 4.2v4.6" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/><circle cx="8" cy="11.6" r="1.1" fill="#fff"/>`,
    soon: `<circle cx="8" cy="8" r="8" fill="${c}"/><path d="M8 4.3V8l2.6 1.6" fill="none" stroke="#1a1a19" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`,
    todo: `<circle cx="8" cy="8" r="6.6" fill="none" stroke="${c}" stroke-width="2.4"/>`,
    unplanned: `<circle cx="8" cy="8" r="6.6" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="2.6 2.2"/>`,
  };
  return `<svg class="st-icon" width="${size}" height="${size}" viewBox="0 0 16 16" aria-label="${STATUS_LABEL[s]}" role="img">${glyph[s]}</svg>`;
}

export function legendStatuses(statuses: Status[] = STATUS_ORDER): string {
  return `<ul class="legend">${statuses
    .map((s) => `<li>${statusIcon(s, 14)}<span>${STATUS_LABEL[s]}</span></li>`)
    .join('')}</ul>`;
}

/** Simple meter: filled part + optional "expected" tick. */
export function meter(value: number, expected?: number, cls = ''): string {
  const v = Math.max(0, Math.min(100, value));
  const tick = expected === undefined || expected <= 0 ? '' : `<span class="meter-tick" style="left:${Math.max(0, Math.min(100, expected))}%"></span>`;
  return `<div class="meter ${cls}"><span class="meter-fill" style="width:${v}%"></span>${tick}</div>`;
}
