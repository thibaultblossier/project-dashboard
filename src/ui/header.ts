import { currentDay, longDate, shortDate } from '../dates';
import type { Metrics } from '../model';
import type { DataSource, ProjectData } from '../types';
import { esc } from './shared';

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const SOURCE_LABEL: Record<DataSource, string> = {
  demo: 'Données de démonstration',
  local: 'Données locales',
  live: 'Données en direct',
  cached: 'Connexion aux données impossible · dernière version connue',
};

/** "à 14:32" today, "le 23 oct. à 14:32" otherwise. */
function when(d: Date): string {
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const day = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000;
  return day === currentDay() ? `à ${time}` : `le ${shortDate(day)} à ${time}`;
}

export function header(data: ProjectData, m: Metrics, source: DataSource, updatedAt: Date): string {
  const p = data.project;
  return `
    <header class="top">
      <div class="top-title">
        ${p.code ? `<span class="eyebrow">${esc(p.code)}</span>` : ''}
        <h1>${esc(p.title)}</h1>
        <p class="subtitle">${esc(p.subtitle)}</p>
      </div>
      <div class="top-meta">
        <div class="today"><span class="dot-live ${source}"></span>${capitalize(longDate(m.today))}</div>
        <div class="source ${source}">${SOURCE_LABEL[source]} · actualisé ${when(updatedAt)}</div>
      </div>
    </header>`;
}

/** Shown when no data could be loaded at all (first visit and source down). */
export function unavailable(): string {
  return `
    <section class="card state-card">
      <h1>Tableau de bord</h1>
      <p>Les données du projet sont momentanément indisponibles.</p>
      <p class="muted">Nouvelle tentative automatique dans quelques minutes.</p>
    </section>`;
}
