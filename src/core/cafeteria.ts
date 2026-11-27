/**
 * «Turno en la cafetería» (R044): cada mesa pide de 1 a 3 cosas; se cargan en la bandeja y se llevan a la mesa.
 * Reglas puras, sin Phaser.
 */
export const MENU_CAFETERIA = ['cafe', 'sandwich', 'manzana', 'sopa'] as const;
export type Plato = (typeof MENU_CAFETERIA)[number];

/** Lo que entra en la bandeja. */
export const CAPACIDAD_BANDEJA = 3;

/** Un pedido nuevo: más largo a medida que avanza el turno (de 1 a 3 cosas). */
export function pedidoCafeteria(atendidos: number, azar: () => number = Math.random): Plato[] {
  const max = Math.min(3, 1 + Math.floor(atendidos / 3));
  const largo = 1 + Math.floor(azar() * max);
  return Array.from({ length: largo }, () => MENU_CAFETERIA[Math.floor(azar() * MENU_CAFETERIA.length)]);
}

/** ¿La bandeja tiene exactamente lo que pidió la mesa (sin importar el orden)? */
export function pedidoCorrecto(bandeja: Plato[], pedido: Plato[]): boolean {
  if (bandeja.length !== pedido.length) return false;
  const a = [...bandeja].sort();
  const b = [...pedido].sort();
  return a.every((x, i) => x === b[i]);
}

/** Puntos por entregar: 4 por cosa y hasta 6 de propina según cuánta paciencia le quedaba (0 a 1). */
export function puntosEntrega(pedido: Plato[], paciencia: number): number {
  return pedido.length * 4 + Math.round(Math.max(0, Math.min(1, paciencia)) * 6);
}

/** Segundos de paciencia de una mesa: más cosas, más espera; el ritmo de la etapa la acorta. */
export function pacienciaMesa(pedido: Plato[], ritmo: number): number {
  return (9 + pedido.length * 3) / Math.sqrt(ritmo);
}
