import type { Metrics } from '../model';
import { catColor, esc, meter, pct, statusIcon } from './shared';

export function categories(m: Metrics): string {
  const rows = m.categories
    .map((c) => {
      const done = c.total ? (c.done / c.total) * 100 : 0;
      const expected = c.total ? (c.expected / c.total) * 100 : 0;
      const behind = done + 0.5 < expected;
      return `
        <li class="cat-row">
          <div class="cat-line">
            <span class="cat-name"><i class="swatch" style="background:${catColor(c.index)}"></i>${esc(c.name)}</span>
            <span class="cat-count">${c.doneCount}/${c.count} tâches</span>
            ${c.lateCount ? `<span class="cat-late">${statusIcon('late', 12)}${c.lateCount}</span>` : ''}
            <span class="cat-pct ${behind ? 'is-behind' : ''}">${pct(done)}</span>
          </div>
          ${meter(done, expected)}
        </li>`;
    })
    .join('');
  return `
    <section class="card card-cats">
      <div class="card-head">
        <h2>Par catégorie</h2>
        <div class="meter-legend"><span><i class="key-fill"></i>Réalisé</span><span><i class="key-tick"></i>Prévu à date</span></div>
      </div>
      <ul class="cats">${rows}</ul>
    </section>`;
}
