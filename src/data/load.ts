import type { DataSource, ProjectData } from '../types';
import { demoData } from './demo';

declare const __LOCAL_DATA__: ProjectData | null;

/** Web-app URL of the Apps Script publishing the Sheet, injected at build time. */
const DATA_URL: string = import.meta.env.VITE_DATA_URL ?? '';
const CACHE_KEY = 'dashboard:last-live';
const TIMEOUT_MS = 20_000;

export type Loaded =
  | { ok: true; data: ProjectData; source: DataSource; updatedAt: Date }
  | { ok: false };

const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function isProjectData(x: unknown): x is ProjectData {
  const d = x as ProjectData;
  return (
    !!d &&
    typeof d === 'object' &&
    !!d.project &&
    isDate(d.project.start) &&
    isDate(d.project.end) &&
    Array.isArray(d.milestones) &&
    Array.isArray(d.tasks) &&
    d.tasks.every((t) => typeof t.id === 'number' && typeof t.name === 'string' && Array.isArray(t.parents))
  );
}

const stamp = (d: ProjectData) => (d.generatedAt ? new Date(d.generatedAt) : new Date());

async function fetchLive(): Promise<ProjectData> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: unknown = await res.json();
    if (!isProjectData(json)) throw new Error('Unexpected data format');
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// The last good live response, so a Google hiccup never blanks the page.
function readCache(): ProjectData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    return isProjectData(data) ? data : null;
  } catch {
    return null;
  }
}

function writeCache(data: ProjectData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable (private window…): nothing to do
  }
}

async function fetchLocalFile(): Promise<ProjectData | null> {
  try {
    const res = await fetch('/local-data/project.json', { cache: 'no-store' });
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null;
    const data: unknown = await res.json();
    return isProjectData(data) ? data : null;
  } catch {
    return null;
  }
}

/**
 * Picks the data to display.
 *
 * - Dev server: `local-data/project.json` when present; `?src=live` or
 *   `?src=demo` force the other sources.
 * - Builds with `VITE_DATA_URL`: the live Sheet, else the last live data
 *   seen in this browser, else (offline file only) the embedded data.
 * - Builds without it: the embedded data (offline file) or the demo.
 */
export async function loadData(): Promise<Loaded> {
  const src = import.meta.env.DEV ? new URLSearchParams(location.search).get('src') : null;
  if (src === 'demo') return { ok: true, data: demoData, source: 'demo', updatedAt: new Date() };

  if (import.meta.env.DEV && src !== 'live') {
    const local = await fetchLocalFile();
    if (local) return { ok: true, data: local, source: 'local', updatedAt: new Date() };
  }

  if (DATA_URL) {
    try {
      const data = await fetchLive();
      writeCache(data);
      return { ok: true, data, source: 'live', updatedAt: stamp(data) };
    } catch (err) {
      console.warn('Live data unavailable:', err);
      const cached = readCache();
      if (cached) return { ok: true, data: cached, source: 'cached', updatedAt: stamp(cached) };
      if (__LOCAL_DATA__) return { ok: true, data: __LOCAL_DATA__, source: 'local', updatedAt: new Date() };
      return { ok: false };
    }
  }

  if (__LOCAL_DATA__) return { ok: true, data: __LOCAL_DATA__, source: 'local', updatedAt: new Date() };
  return { ok: true, data: demoData, source: 'demo', updatedAt: new Date() };
}
