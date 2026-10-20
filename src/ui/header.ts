import { longDate } from '../dates';
import type { Metrics } from '../model';
import type { DataSource, ProjectData } from '../types';
import { esc } from './shared';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SOURCE_LABEL: Record<DataSource, string> = {
  demo: 'Données de démonstration',
  local: 'Données locales',
  live: 'Données en direct',
};

export function header(data: ProjectData, m: Metrics, source: DataSource, loadedAt: Date): string {
  const p = data.project;
  const time = loadedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `
    <header class="top">
      <div class="top-title">
        ${p.code ? `<span class="eyebrow">${esc(p.code)}</span>` : ''}
        <h1>${esc(p.title)}</h1>
        <p class="subtitle">${esc(p.subtitle)}</p>
      </div>
      <div class="top-meta">
        <div class="today"><span class="dot-live ${source}"></span>${capitalize(longDate(m.today))}</div>
        <div class="source">${SOURCE_LABEL[source]} · actualisé à ${time}</div>
      </div>
    </header>`;
}
