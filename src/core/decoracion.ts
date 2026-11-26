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

/**
 * Solo electrodomésticos y objetos de casa dibujados para este fin (hoja `electrodomesticos.png`).
 * Los objetos de los minijuegos (radio vieja, osito, flores...) no se venden: quedaban mal en la casa.
 * Un objeto solo se ofrece cuando su imagen está cargada en el juego.
 */
export const DECORACIONES: Decoracion[] = [
  { id: 'heladera', nombre: 'Heladera', imagen: 'heladera', precio: 300, donde: ['suelo'], alto: 58 },
  { id: 'tele', nombre: 'Televisor', imagen: 'tele', precio: 250, donde: ['mesada', 'suelo'], alto: 26 },
  { id: 'lampara', nombre: 'Lámpara de pie', imagen: 'lampara', precio: 120, donde: ['suelo'], alto: 56 },
  { id: 'microondas', nombre: 'Microondas', imagen: 'microondas', precio: 180, donde: ['mesada'], alto: 20 },
  { id: 'cafetera', nombre: 'Cafetera', imagen: 'cafetera', precio: 90, donde: ['mesada', 'mesa'], alto: 20 },
  { id: 'tostadora', nombre: 'Tostadora', imagen: 'tostadora', precio: 70, donde: ['mesada', 'mesa'], alto: 14 },
  { id: 'planta', nombre: 'Planta', imagen: 'planta', precio: 60, donde: ['suelo', 'mesa'], alto: 34 },
  { id: 'reloj_pared', nombre: 'Reloj', imagen: 'reloj_pared', precio: 80, donde: ['estante'], alto: 16 },
  { id: 'radiocasete', nombre: 'Radiocasete', imagen: 'radiocasete', precio: 110, donde: ['estante', 'mesada'], alto: 18 },
];

export function decoracion(id: string): Decoracion | undefined {
  return DECORACIONES.find((d) => d.id === id);
}

/** Objetos que se pueden poner en un hueco de ese tipo (opcionalmente, solo los que tienen imagen). */
export function paraHueco(tipo: TipoHueco, hayImagen: (imagen: string) => boolean = () => true): Decoracion[] {
  return DECORACIONES.filter((d) => d.donde.includes(tipo) && hayImagen(d.imagen));
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
