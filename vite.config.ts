import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const LOCAL_DATA = resolve(import.meta.dirname, 'local-data/project.json');
const OFFLINE_OUT = '.offline';
const OFFLINE_FILE = resolve(import.meta.dirname, 'Ouvrir le tableau de bord.html');

/**
 * Inlines every script and stylesheet into index.html, so the page opens
 * straight from disk (file://) with a double click, no server needed.
 */
function singleFile(): Plugin {
  return {
    name: 'single-file',
    enforce: 'post',
    generateBundle(_, bundle) {
      const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'));
      if (!html || html.type !== 'asset') return;
      let source = String(html.source);
      for (const [name, file] of Object.entries(bundle)) {
        if (file.type === 'chunk' && name.endsWith('.js')) {
          const tag = new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`);
          const code = file.code.replace(/<\/script/gi, '<\\/script');
          source = source.replace(tag, () => `<script type="module">${code}</script>`);
          delete bundle[name];
        } else if (file.type === 'asset' && name.endsWith('.css')) {
          const tag = new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`);
          source = source.replace(tag, () => `<style>${file.source}</style>`);
          delete bundle[name];
        }
      }
      html.source = source;
    },
    closeBundle() {
      copyFileSync(resolve(import.meta.dirname, OFFLINE_OUT, 'index.html'), OFFLINE_FILE);
    },
  };
}

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline';
  if (offline && !existsSync(LOCAL_DATA)) throw new Error(`Missing ${LOCAL_DATA}`);
  return {
    // Relative base so the build works under any GitHub Pages sub-path.
    base: './',
    define: {
      // Only the offline build embeds the private data; the public build gets `null`.
      __LOCAL_DATA__: offline ? readFileSync(LOCAL_DATA, 'utf8') : 'null',
    },
    plugins: offline ? [singleFile()] : [],
    build: {
      target: 'es2022',
      ...(offline ? { outDir: OFFLINE_OUT, assetsInlineLimit: Infinity, modulePreload: false } : {}),
    },
  };
});
