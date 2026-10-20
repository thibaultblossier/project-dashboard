import type { DataSource, ProjectData } from '../types';
import { demoData } from './demo';

declare const __LOCAL_DATA__: ProjectData | null;

export interface Loaded {
  data: ProjectData;
  source: DataSource;
}

/**
 * Picks the data to display.
 *
 * - Offline file (`npm run offline`): the local data embedded at build time.
 * - Dev server: `local-data/project.json` (git-ignored, never deployed) when it
 *   exists, unless `?src=demo` is in the URL.
 * - Public build: the fictional demo until the live source is connected.
 */
export async function loadData(): Promise<Loaded> {
  if (__LOCAL_DATA__) return { data: __LOCAL_DATA__, source: 'local' };
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('src') !== 'demo') {
    try {
      const res = await fetch('/local-data/project.json', { cache: 'no-store' });
      if (res.ok && res.headers.get('content-type')?.includes('json')) {
        return { data: (await res.json()) as ProjectData, source: 'local' };
      }
    } catch {
      // fall through to the demo
    }
  }
  return { data: demoData, source: 'demo' };
}
