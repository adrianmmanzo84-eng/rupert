import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

// base relativa: el build funciona en cualquier subcarpeta (GitHub Pages).
export default defineConfig({
  base: './',
  define: { __VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
