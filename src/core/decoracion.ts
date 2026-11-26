/**
 * Decoración de la casa propia (etapa 9): objetos que se compran con monedas y se ponen en los huecos
 * del interior (estantes, mesadas, mesa y rincones del suelo). Datos y reglas puras, sin Phaser.
 */
import type { Estado } from './estado';

export type TipoHueco = 'estante' | 'mesada' | 'mesa' | 'suelo';

export interface Hueco {
  id: string;
  nombre: string;
  tipo: TipoHueco;
  /** Centro del borde donde se apoya el objeto (coordenadas del mundo 480×270). */
  x: number;
  y: number;
  /** Ancho y alto disponibles (px del mundo): el objeto se achica si no entra. */
  ancho: number;
  alto: number;
}

export interface Decoracion {
  id: string;
  nombre: string;
  /** Imagen del objeto (las mismas que usan los minijuegos). */
  imagen: string;
  precio: number;
  donde: TipoHueco[];
  /** Alto en la escena, en px del mundo (la mesa mide 60 px = 75 cm). */
  alto: number;
}

export const DECORACIONES: Decoracion[] = [
  { id: 'flores', nombre: 'Flores en un vaso', imagen: 'flor', precio: 35, donde: ['mesa', 'estante', 'mesada'], alto: 20 },
  { id: 'taza', nombre: 'Taza de cerámica', imagen: 'taza', precio: 30, donde: ['mesa', 'mesada'], alto: 12 },
  { id: 'patito', nombre: 'Patito de goma', imagen: 'patito', precio: 40, donde: ['estante'], alto: 14 },
  { id: 'autito', nombre: 'Autito de colección', imagen: 'autito', precio: 45, donde: ['estante'], alto: 12 },
  { id: 'libros', nombre: 'Libros', imagen: 'libro', precio: 50, donde: ['estante', 'mesa'], alto: 14 },
  { id: 'platos', nombre: 'Pila de platos', imagen: 'pila_platos', precio: 50, donde: ['mesada'], alto: 16 },
  { id: 'frasco', nombre: 'Frasco de galletitas', imagen: 'frasco', precio: 25, donde: ['mesada', 'estante'], alto: 18 },
  { id: 'osito', nombre: 'Osito de peluche', imagen: 'osito', precio: 60, donde: ['estante', 'suelo'], alto: 22 },
  { id: 'perfume', nombre: 'Perfume', imagen: 'perfume', precio: 60, donde: ['estante'], alto: 15 },
  { id: 'vino', nombre: 'Botella de vino', imagen: 'botella_vino', precio: 70, donde: ['mesa', 'mesada'], alto: 28 },
  { id: 'auriculares', nombre: 'Auriculares', imagen: 'auriculares', precio: 80, donde: ['estante', 'mesa'], alto: 16 },
  { id: 'reloj', nombre: 'Reloj antiguo', imagen: 'reloj', precio: 90, donde: ['estante', 'mesa'], alto: 16 },
  { id: 'radio', nombre: 'Radio', imagen: 'radio', precio: 120, donde: ['estante', 'mesada'], alto: 22 },
  { id: 'paraguas', nombre: 'Paraguas en el rincón', imagen: 'paraguas', precio: 30, donde: ['suelo'], alto: 46 },
  { id: 'herramientas', nombre: 'Caja de herramientas', imagen: 'caja_herramientas', precio: 55, donde: ['suelo'], alto: 22 },
];

export function decoracion(id: string): Decoracion | undefined {
  return DECORACIONES.find((d) => d.id === id);
}

/** Objetos que se pueden poner en un hueco de ese tipo. */
export function paraHueco(tipo: TipoHueco): Decoracion[] {
  return DECORACIONES.filter((d) => d.donde.includes(tipo));
}

/** Compra un objeto (si no lo tiene ya) y lo pone en el hueco. Lo que había vuelve a quedar guardado. */
export function ponerDecoracion(e: Estado, hueco: Hueco, id: string): 'puesto' | 'sin-monedas' | 'no-entra' {
  const d = decoracion(id);
  if (!d || !d.donde.includes(hueco.tipo)) return 'no-entra';
  if (!e.decoraciones.includes(id)) {
    if (e.monedas < d.precio) return 'sin-monedas';
    e.monedas -= d.precio;
    e.decoraciones.push(id);
  }
  // Un objeto está en un solo hueco a la vez: si estaba en otro, se mueve.
  for (const [h, v] of Object.entries(e.casa)) if (v === id) delete e.casa[h];
  e.casa[hueco.id] = id;
  return 'puesto';
}

export function quitarDecoracion(e: Estado, huecoId: string): void {
  delete e.casa[huecoId];
}
