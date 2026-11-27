/**
 * Reglas puras de «Escalar el edificio» (R036, R038): 30 segundos para trepar por los caños hasta el dpto,
 * esquivando lo que cae. Cada golpe resta segundos, las monedas los devuelven y se sube cada vez más rápido.
 */

type Azar = () => number;

export const CARRILES = 3;
/** Alto de un piso, en px del mundo. */
export const ALTO_PISO = 70;
/** Tiempo con que se empieza (y tope), en segundos. */
export const TIEMPO_INICIAL = 30;
export const TIEMPO_MAX = 30;
/** Pisos hasta el dpto: llegar ahí termina la partida con premio. */
export const META_PISOS = 20;
export const SEGUNDOS_PISO = 0.5;
export const SEGUNDOS_MONEDA = 1;
export const SEGUNDOS_GOLPE = 3;
/** Cada cuántos pisos hay festejo (con segundos de regalo). */
export const PISOS_HITO = 5;
export const SEGUNDOS_HITO = 1;
/** Premio por llegar: fijo y por cada segundo que sobra. */
export const PREMIO_LLEGADA = 20;
export const PREMIO_SEGUNDO = 3;

/** Velocidad de ascenso (px del mundo por segundo): sube con los pisos y con la etapa, hasta un tope. */
export function velocidad(pisos: number, ritmo: number): number {
  return Math.min(170, (38 + 1.8 * pisos) * ritmo);
}

/** Segundos entre una caída y la siguiente: bajan de 1,2 a 0,45 con la altura. */
export function intervalo(pisos: number): number {
  return Math.max(0.45, 1.2 - 0.03 * pisos);
}

/** Qué cae: objeto liviano, maceta (pesada, avisa antes), mueble (más pesado todavía), paloma (zigzaguea) o moneda. */
export type TipoCaida = 'objeto' | 'maceta' | 'mueble' | 'paloma' | 'moneda';

export interface Caida {
  carril: number;
  tipo: TipoCaida;
}

/**
 * Lo que cae en la próxima tanda. Una de cada cinco veces es una moneda. Del resto: desde el piso 3 a veces una
 * maceta, desde el 6 a veces una paloma y desde el 10 a veces un mueble. Desde el piso 8 a veces caen dos a la vez
 * (siempre queda un carril libre).
 */
export function siguienteTanda(pisos: number, azar: Azar = Math.random): Caida[] {
  const carril = () => Math.floor(azar() * CARRILES);
  if (azar() < 0.2) return [{ carril: carril(), tipo: 'moneda' }];
  const elegir = (): TipoCaida => {
    const r = azar();
    if (pisos >= 10 && r < 0.12) return 'mueble';
    if (pisos >= 6 && r < 0.27) return 'paloma';
    if (pisos >= 3 && r < 0.45) return 'maceta';
    return 'objeto';
  };
  const a = carril();
  const res: Caida[] = [{ carril: a, tipo: elegir() }];
  if (pisos >= 8 && azar() < Math.min(0.5, 0.15 + 0.02 * (pisos - 8))) {
    let b = carril();
    if (b === a) b = (a + 1) % CARRILES;
    res.push({ carril: b, tipo: elegir() });
  }
  return res;
}

/** Puntos por piso: 2, y uno más cada 10 pisos. */
export function puntosPiso(piso: number): number {
  return 2 + Math.floor(piso / 10);
}

/** Puntos de más por llegar al dpto con tiempo de sobra. */
export function premioLlegada(segundosQueSobran: number): number {
  return PREMIO_LLEGADA + PREMIO_SEGUNDO * Math.max(0, Math.floor(segundosQueSobran));
}

/** Tiempo restante después de ganar o perder segundos (nunca pasa del tope ni baja de cero). */
export function conTiempo(actual: number, delta: number): number {
  return Math.max(0, Math.min(TIEMPO_MAX, actual + delta));
}
