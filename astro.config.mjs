// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://jabed-tech.github.io',
  base: '/dnd-2024-reference',
  trailingSlash: 'always',
  build: { format: 'directory' },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
