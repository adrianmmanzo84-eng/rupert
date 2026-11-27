/**
 * Reglas puras de «Escalar el edificio» (R036): trepar por los caños esquivando lo que cae.
 * Cada piso suma segundos, cada golpe los resta, y la caída se acelera sin parar.
 */

type Azar = () => number;

export const CARRILES = 3;
/** Alto de un piso, en px del mundo. */
export const ALTO_PISO = 70;
/** Tiempo con que se empieza y tope de tiempo acumulado, en segundos. */
export const TIEMPO_INICIAL = 30;
export const TIEMPO_MAX = 45;
export const SEGUNDOS_PISO = 1.5;
export const SEGUNDOS_MONEDA = 1;
export const SEGUNDOS_GOLPE = 3;
/** Cada cuántos pisos hay festejo y segundos de regalo. */
export const PISOS_HITO = 10;
export const SEGUNDOS_HITO = 3;

/** Velocidad de ascenso (px del mundo por segundo): sube con los pisos y con la etapa, hasta un tope. */
export function velocidad(pisos: number, ritmo: number): number {
  return Math.min(170, (38 + 1.8 * pisos) * ritmo);
}

/** Segundos entre una caída y la siguiente: bajan de 1,2 a 0,45 con la altura. */
export function intervalo(pisos: number): number {
  return Math.max(0.45, 1.2 - 0.03 * pisos);
}

export interface Caida {
  carril: number;
  tipo: 'objeto' | 'moneda';
}

/**
 * Lo que cae en la próxima tanda: casi siempre un objeto en un carril; desde el piso 8, a veces dos a la vez
 * (siempre queda un carril libre); una de cada cinco veces, una moneda.
 */
export function siguienteTanda(pisos: number, azar: Azar = Math.random): Caida[] {
  const carril = () => Math.floor(azar() * CARRILES);
  if (azar() < 0.2) return [{ carril: carril(), tipo: 'moneda' }];
  const a = carril();
  const res: Caida[] = [{ carril: a, tipo: 'objeto' }];
  if (pisos >= 8 && azar() < Math.min(0.5, 0.15 + 0.02 * (pisos - 8))) {
    let b = carril();
    if (b === a) b = (a + 1) % CARRILES;
    res.push({ carril: b, tipo: 'objeto' });
  }
  return res;
}

/** Puntos por piso: 2, y uno más cada 10 pisos. */
export function puntosPiso(piso: number): number {
  return 2 + Math.floor(piso / PISOS_HITO);
}

/** Tiempo restante después de ganar o perder segundos (nunca pasa del tope ni baja de cero). */
export function conTiempo(actual: number, delta: number): number {
  return Math.max(0, Math.min(TIEMPO_MAX, actual + delta));
}
