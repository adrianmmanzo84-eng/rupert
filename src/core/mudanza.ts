/**
 * «Cargar la mudanza» (R044): encastrar cajas y muebles en el baúl del auto, que es una grilla. Cada cosa
 * ocupa un rectángulo de casillas y se puede girar. Reglas puras, sin Phaser.
 */

export interface Mueble {
  id: string;
  nombre: string;
  /** Imagen del juego que lo dibuja. */
  imagen: string;
  /** Casillas que ocupa (ancho × alto) sin girar. */
  w: number;
  h: number;
}

/** Lo que hay para cargar. Las imágenes ya existen en el juego (electrodomésticos, cajas y objetos). */
export const MUEBLES: Mueble[] = [
  { id: 'caja', nombre: 'Caja', imagen: 'caja', w: 1, h: 1 },
  { id: 'carton', nombre: 'Cajas de cartón', imagen: 'carton', w: 2, h: 1 },
  { id: 'tele', nombre: 'Televisor', imagen: 'tele', w: 2, h: 2 },
  { id: 'microondas', nombre: 'Microondas', imagen: 'microondas', w: 2, h: 1 },
  { id: 'lampara', nombre: 'Lámpara de pie', imagen: 'lampara', w: 1, h: 3 },
  { id: 'heladera', nombre: 'Heladera', imagen: 'heladera', w: 2, h: 3 },
  { id: 'radiocasete', nombre: 'Radiocasete', imagen: 'radiocasete', w: 2, h: 1 },
  { id: 'planta', nombre: 'Planta', imagen: 'planta', w: 1, h: 2 },
  { id: 'cafetera', nombre: 'Cafetera', imagen: 'cafetera', w: 1, h: 1 },
  { id: 'tostadora', nombre: 'Tostadora', imagen: 'tostadora', w: 1, h: 1 },
  { id: 'reloj', nombre: 'Reloj de pared', imagen: 'reloj_pared', w: 1, h: 1 },
  { id: 'osito', nombre: 'Osito (no se negocia)', imagen: 'osito', w: 1, h: 1 },
];

/** El baúl: casillas libres (null) u ocupadas por el número de la pieza. */
export interface Baul {
  w: number;
  h: number;
  celdas: (number | null)[];
}

export function nuevoBaul(w: number, h: number): Baul {
  return { w, h, celdas: Array(w * h).fill(null) };
}

/** Medidas de una pieza según esté girada o no. */
export function medidas(m: Mueble, girado: boolean): { w: number; h: number } {
  return girado ? { w: m.h, h: m.w } : { w: m.w, h: m.h };
}

/** ¿Entra con su esquina de arriba a la izquierda en (x, y)? */
export function cabe(b: Baul, w: number, h: number, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x + w > b.w || y + h > b.h) return false;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (b.celdas[j * b.w + i] !== null) return false;
  return true;
}

export function poner(b: Baul, w: number, h: number, x: number, y: number, n: number): boolean {
  if (!cabe(b, w, h, x, y)) return false;
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) b.celdas[j * b.w + i] = n;
  return true;
}

/** ¿Hay algún lugar donde entre, girada o no? */
export function hayLugar(b: Baul, m: Mueble): boolean {
  for (const g of [false, true]) {
    const { w, h } = medidas(m, g);
    for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) if (cabe(b, w, h, x, y)) return true;
  }
  return false;
}

/** Parte del baúl ocupada (0 a 1). */
export function llenado(b: Baul): number {
  return b.celdas.filter((c) => c !== null).length / b.celdas.length;
}

/** Puntos por cargar una pieza: más casillas, más puntos. */
export function puntosPieza(m: Mueble): number {
  return 2 + m.w * m.h * 2;
}

/** Premio por cerrar el baúl según cuánto se llenó (lleno del todo: el doble). */
export function premioBaul(b: Baul): number {
  const f = llenado(b);
  return f >= 1 ? 40 : f >= 0.85 ? 20 : f >= 0.7 ? 10 : 0;
}

/**
 * La próxima pieza. Las grandes salen al principio de cada baúl y las chicas al final (así casi siempre hay
 * dónde ponerlas), pero con algo de azar.
 */
export function siguientePieza(b: Baul, azar: () => number = Math.random): Mueble {
  const f = llenado(b);
  const posibles = MUEBLES.filter((m) => hayLugar(b, m));
  const lista = posibles.length ? posibles : MUEBLES;
  const pesos = lista.map((m) => {
    const area = m.w * m.h;
    return f < 0.4 ? area : f < 0.75 ? 2 : 1 / area;
  });
  let r = azar() * pesos.reduce((s, p) => s + p, 0);
  for (let i = 0; i < lista.length; i++) {
    r -= pesos[i];
    if (r <= 0) return lista[i];
  }
  return lista[lista.length - 1];
}
