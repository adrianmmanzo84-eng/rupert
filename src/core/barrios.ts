/**
 * Barrios (R021): en vez de un único Rupert mundial, cada grupo de jugadores ("barrio") tiene su propio Rupert,
 * su fondo y sus metas. Todos los barrios recorren las mismas etapas, cada uno a su ritmo.
 * Aquí están las reglas puras; la asignación real la hace el servidor (fase 2, Firebase).
 */

/** Máximo de vecinos por barrio. Al llenarse uno, el servidor abre otro. */
export const CUPO_BARRIO = 500;

/** Días sin entrar tras los que un vecino libera su lugar (si vuelve, sigue en su barrio aunque se pase del cupo). */
export const DIAS_INACTIVO = 30;

/**
 * PA por vecino que pide cada meta (índice = etapa actual). Con un barrio lleno de 500 vecinos dan las metas
 * del documento de concepto: 5.000, 15.000, 30.000... hasta 400.000 PA.
 */
export const PA_POR_VECINO = [10, 30, 60, 100, 160, 240, 360, 520, 800];

/** Metas de un barrio según su cupo: así todos los barrios avanzan a un ritmo parecido. */
export function metasDeBarrio(cupo = CUPO_BARRIO): number[] {
  return PA_POR_VECINO.map((pa) => pa * cupo);
}

export interface Barrio {
  id: number;
  /** Vecinos activos (los que entraron en los últimos DIAS_INACTIVO días). */
  vecinos: number;
  cupo: number;
}

/** ¿Hay lugar para un vecino nuevo? */
export function tieneLugar(b: Barrio): boolean {
  return b.vecinos < b.cupo;
}

/**
 * Barrio para un jugador nuevo: el más antiguo que tenga lugar (así se llenan en orden) o, si todos están
 * llenos, uno nuevo con el id siguiente. Lo usará la función del servidor; aquí se prueba la regla.
 */
export function asignarBarrio(barrios: Barrio[], cupo = CUPO_BARRIO): { id: number; nuevo: boolean } {
  const libre = [...barrios].sort((a, b) => a.id - b.id).find(tieneLugar);
  if (libre) return { id: libre.id, nuevo: false };
  return { id: barrios.reduce((m, b) => Math.max(m, b.id), 0) + 1, nuevo: true };
}

/** ¿Sigue ocupando lugar este vecino? */
export function estaActivo(ultimaVisita: number, ahora: number): boolean {
  return ahora - ultimaVisita < DIAS_INACTIVO * 86_400_000;
}

export function nombreBarrio(id: number): string {
  return `Barrio ${id}`;
}
