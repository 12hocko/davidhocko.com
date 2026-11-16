// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Preview build: flat .html files with relative links, so the site works
// from any folder (private preview now, the real domain later).
export default defineConfig({
  site: 'https://davidhocko.com',
  build: {
    format: 'file',
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
