import Phaser from 'phaser';
import { CHAPAS, type Chapa } from '../core/minijuegos';

/**
 * Arte provisional dibujado por código (ratones y chapitas) hasta tener el definitivo de ChatGPT.
 * Cada mapa es una lista de filas; cada letra es un color de la paleta y el punto es transparente.
 */

function dibujar(esc: Phaser.Scene, clave: string, mapa: string[], paleta: Record<string, string>): void {
  if (esc.textures.exists(clave)) return;
  const h = mapa.length;
  const w = Math.max(...mapa.map((f) => f.length));
  const tex = esc.textures.createCanvas(clave, w, h);
  if (!tex) return;
  const ctx = tex.getContext();
  mapa.forEach((fila, y) => {
    [...fila].forEach((c, x) => {
      const color = paleta[c];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    });
  });
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

const RATON_A = [
  '..........kk......',
  '.........kppk.....',
  '...kkkkkkkppkk....',
  '..kccccccckcccck..',
  'pkcccccccccccwkk..',
  '.kccllcccccccccpk.',
  '..kcllllcccccckk..',
  '...kkccccccckk....',
  '....k.kk..kk.k....',
];
const RATON_B = [
  '..........kk......',
  '.........kppk.....',
  '...kkkkkkkppkk....',
  '..kccccccckcccck..',
  '.kcccccccccccwkk..',
  'pkccllcccccccccpk.',
  '..kcllllcccccckk..',
  '...kkccccccckk....',
  '.....kk.kk..kk....',
];

/** Colores de pelaje de los cuatro ratones de la carrera; el primero lleva bufanda roja como Rupert. */
export const PELAJES = ['#9a8f9a', '#a8774f', '#e8e2d8', '#5c5560'];

const COLOR_CHAPA: Record<Chapa, [string, string, string]> = {
  roja: ['#d8433b', '#8e2421', '#ff9c8c'],
  azul: ['#3f72d8', '#22428e', '#9cc2ff'],
  amarilla: ['#f2c53d', '#a07a17', '#fff2a8'],
  verde: ['#3fae5a', '#1f6a33', '#a8f0b4'],
  plateada: ['#b9c0c8', '#6b7480', '#ffffff'],
};

const CHAPA = [
  '..kdkdk..',
  '.dcccccd.',
  'kcbbcccck',
  'dcbccccud',
  'kcccccccuk',
  'dcccccccud',
  'kccccccuk',
  '.duccuud.',
  '..kdkdk..',
];

export function crearTexturas(esc: Phaser.Scene): void {
  PELAJES.forEach((pelo, i) => {
    const paleta: Record<string, string> = { k: '#2b1d24', c: pelo, l: '#ffffff33', p: '#e89aa8', w: '#ffffff' };
    if (i === 0) paleta.l = '#d8433b'; // bufanda roja del ratón del jugador
    dibujar(esc, `raton${i}_0`, RATON_A, paleta);
    dibujar(esc, `raton${i}_1`, RATON_B, paleta);
  });
  for (const c of CHAPAS) {
    const [base, borde, brillo] = COLOR_CHAPA[c];
    dibujar(esc, `chapa_${c}`, CHAPA, { k: '#2b1d24', d: borde, c: base, b: brillo, u: borde });
  }
}
