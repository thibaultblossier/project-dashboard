import './styles.css';
import { loadData } from './data/load';
import { currentDay } from './dates';
import { compute } from './model';
import { categories } from './ui/categories';
import { curveCard, drawCurve } from './ui/curve';
import { drawGraph, graphCard } from './ui/graph';
import { header } from './ui/header';
import { kpis } from './ui/kpis';
import { timeline } from './ui/timeline';
import { installTaskTooltips, setTooltipMetrics } from './ui/tooltip';
import { watch } from './ui/watch';

const REFRESH_MS = 5 * 60 * 1000;
const app = document.querySelector<HTMLDivElement>('#app')!;
let observers: ResizeObserver[] = [];

/** Redraws a pixel-sized chart whenever its container width changes. */
function sized(el: HTMLElement, draw: (el: HTMLElement) => void) {
  // Draw right away: ResizeObserver only fires on painted frames, which a
  // background tab may never produce.
  let width = el.clientWidth;
  draw(el);
  const ro = new ResizeObserver(() => {
    if (el.clientWidth === width) return;
    width = el.clientWidth;
    draw(el);
  });
  ro.observe(el);
  observers.push(ro);
}

async function render() {
  const { data, source } = await loadData();
  const m = compute(data, currentDay());
  setTooltipMetrics(m);
  document.title = `${data.project.title} · Tableau de bord`;

  observers.forEach((o) => o.disconnect());
  observers = [];

  app.innerHTML = `
    ${header(data, m, source, new Date())}
    <main>
      ${kpis(m)}
      <div class="row-2">${curveCard(m)}${categories(m)}</div>
      ${watch(m)}
      ${timeline(m)}
      ${graphCard(m)}
    </main>
    <footer>Actualisation automatique toutes les 5 minutes</footer>`;

  sized(app.querySelector('#curve')!, (el) => drawCurve(el, m));
  sized(app.querySelector('#graph')!, (el) => drawGraph(el, m));
}

installTaskTooltips();
render();
setInterval(render, REFRESH_MS);
