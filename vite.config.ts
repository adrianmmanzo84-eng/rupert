import { defineConfig } from 'vite';
import { readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Al compilar (R042), las imágenes del juego pasan de PNG a WebP sin pérdida (un 24 % menos de peso).
 * Los PNG siguen siendo la fuente en `public/`; el juego pide la extensión `EXT` de Arranque.ts.
 */
function webp() {
  return {
    name: 'rupert-webp',
    apply: 'build' as const,
    async closeBundle() {
      const sharp = (await import('sharp')).default;
      const base = join(process.cwd(), 'dist', 'assets');
      let antes = 0;
      let despues = 0;
      for (const carpeta of ['fondos', 'minijuegos', 'objetos', 'rupert', 'ui']) {
        const dir = join(base, carpeta);
        for (const f of readdirSync(dir)) {
          // El ícono de la pestaña lo pide el HTML, no el juego: queda en PNG.
          if (!f.endsWith('.png') || f === 'favicon.png') continue;
          const png = join(dir, f);
          const salida = png.replace(/\.png$/, '.webp');
          antes += statSync(png).size;
          await sharp(png).webp({ lossless: true, effort: 6 }).toFile(salida);
          despues += statSync(salida).size;
          unlinkSync(png);
        }
      }
      console.log(`webp: ${(antes / 1e6).toFixed(2)} MB → ${(despues / 1e6).toFixed(2)} MB`);
    },
  };
}

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

// base relativa: el build funciona en cualquier subcarpeta (GitHub Pages).
export default defineConfig({
  base: './',
  plugins: [webp()],
  define: { __VERSION__: JSON.stringify(version) },
  build: { target: 'es2022', chunkSizeWarningLimit: 2500 },
  test: { include: ['tests/**/*.test.ts'] },
} as never);
