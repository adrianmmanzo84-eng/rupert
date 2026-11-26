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

/** Cuerpo del ratón mirando a la derecha (26×11); las patas se agregan por fotograma. */
const CUERPO = [
  '................kk........',
  '...............kppk.kk....',
  '...........kkkkkppkkppk...',
  '.........kkcccccckkcppk...',
  '........kccccccccccckkk...',
  '.......kcclccccccccccwek..',
  'pp....kccllccccccccccccpk.',
  '.pp..kcclllcccccccccccck..',
  '..pppkcclllccccccccdddk...',
  '....kddcccccccccddddkk....',
  '.....kkddddddddddkkk......',
];

/** Cuatro posiciones de patas para el ciclo de carrera. */
const PATAS = [
  ['......kpk...kpk..kpk.....', '.....kpk.....kpk...kpk....'],
  ['.......kpk...kpk.kpk.....', '........kpk..kpk..kpk.....'],
  ['......kpk..kpk...kpk.....', '......kpk.kpk.....kpk.....'],
  ['.......kpkkpk....kpk.....', '.......kpk.kpk...kpk......'],
];

/** Bufanda roja del ratón del jugador: píxeles del cuello (fila, columna). */
const BUFANDA: [number, number][] = [
  [3, 16], [4, 16], [4, 17], [5, 16], [5, 17], [6, 16], [6, 17], [7, 17], [8, 17], [8, 18], [9, 18],
];

/** Colores de pelaje de los cuatro ratones de la carrera; el primero lleva bufanda roja como Rupert. */
export const PELAJES: [string, string, string][] = [
  ['#9a8f9a', '#6f6672', '#c9c0c8'],
  ['#b07a4f', '#7d5336', '#d8a57c'],
  ['#ece6dc', '#bdb3a6', '#ffffff'],
  ['#5c5560', '#3d383f', '#857c88'],
];

function raton(fotograma: number, bufanda: boolean): string[] {
  const filas = CUERPO.map((f) => f.padEnd(26, '.').split(''));
  if (bufanda) for (const [y, x] of BUFANDA) if (filas[y][x] !== '.' && filas[y][x] !== 'k') filas[y][x] = 'r';
  // El cuerpo sube un píxel en los fotogramas de vuelo.
  const cuerpo = filas.map((f) => f.join(''));
  const salto = fotograma % 2 === 1;
  const patas = PATAS[fotograma];
  return salto ? [...cuerpo, ...patas, '.'] : ['.', ...cuerpo, ...patas];
}

const COLOR_CHAPA: Record<string, [string, string, string]> = {
  roja: ['#d8433b', '#8e2421', '#ff9c8c'],
  azul: ['#3f72d8', '#22428e', '#9cc2ff'],
  amarilla: ['#f2c53d', '#a07a17', '#fff2a8'],
  verde: ['#3fae5a', '#1f6a33', '#a8f0b4'],
  plateada: ['#b9c0c8', '#6b7480', '#ffffff'],
  naranja: ['#f08a2c', '#a5521a', '#ffc98c'],
  violeta: ['#8a52c8', '#53307e', '#cfa8ff'],
  negra: ['#3a3640', '#1a181e', '#8a8592'],
  dorada: ['#e8b520', '#8f6a0c', '#fff0a0'],
  rosa: ['#f08ab8', '#a8507a', '#ffd0e6'],
  celeste: ['#5ec8f0', '#2a7ea8', '#c8f2ff'],
  blanca: ['#ece8e0', '#a39e96', '#ffffff'],
};

/** Chapita con borde dentado (13×13). */
const CHAPA = [
  '...kdkdkdk...',
  '..dcccccccd..',
  '.kcbbcccccck.',
  'dcbbcccccccud',
  'kcbccccccccuk',
  'dcccccccccccd',
  'kcccccccccccuk',
  'dcccccccccccud',
  'kcccccccccccuk',
  'dccccccccccud.',
  '.kccccccccuuk.',
  '..duccccuuud..',
  '...kdkdkdk....',
];
const ESTRELLA: [number, number][] = [[4, 6], [5, 5], [5, 6], [5, 7], [6, 4], [6, 5], [6, 6], [6, 7], [6, 8], [7, 5], [7, 6], [7, 7], [8, 5], [8, 7]];
const PUNTO: [number, number][] = [[5, 5], [5, 6], [5, 7], [6, 5], [6, 6], [6, 7], [7, 5], [7, 6], [7, 7]];

function chapa(c: Chapa): { mapa: string[]; paleta: Record<string, string> } {
  const [color, dibujo] = c.split('_') as [string, string | undefined];
  const [base, borde, brillo] = COLOR_CHAPA[color];
  const filas = CHAPA.map((f) => f.split(''));
  const marca = dibujo === 'estrella' ? ESTRELLA : dibujo === 'punto' ? PUNTO : [];
  for (const [y, x] of marca) filas[y][x] = 'm';
  const tinta = color === 'blanca' || color === 'amarilla' || color === 'dorada' ? '#2b1d24' : '#fffaf0';
  return { mapa: filas.map((f) => f.join('')), paleta: { k: '#2b1d24', d: borde, c: base, b: brillo, u: borde, m: tinta } };
}

export function crearTexturas(esc: Phaser.Scene): void {
  PELAJES.forEach(([pelo, sombra, luz], i) => {
    const paleta: Record<string, string> = { k: '#2b1d24', c: pelo, d: sombra, l: luz, p: '#e89aa8', w: '#ffffff', e: '#1b1424', r: '#d8433b' };
    for (let f = 0; f < PATAS.length; f++) dibujar(esc, `raton${i}_${f}`, raton(f, i === 0), paleta);
  });
  for (const c of CHAPAS) {
    const { mapa, paleta } = chapa(c);
    dibujar(esc, `chapa_${c}`, mapa, paleta);
  }
}
