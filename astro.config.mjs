import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';

const cfg = JSON.parse(readFileSync(new URL('./content/site.config.json', import.meta.url), 'utf8'));
// SITE_BASE=/barber-site/ — сборка предпросмотра для GitHub Pages; на боевом домене переменная не нужна.
const base = process.env.SITE_BASE || '/';

export default defineConfig({
  site: process.env.SITE_URL || cfg.site.url,
  base,
  outDir: process.env.OUT_DIR || 'dist',
  trailingSlash: 'ignore',
  build: { inlineStylesheets: 'always', assets: 'assets' },
});
