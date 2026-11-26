import { CONFIG, avanzarTiempo, comprobarMeta, type Estado, simularComunidad, visitaDiaria, type ResultadoDia } from './core/estado';
import { cargar, guardar } from './core/guardado';

/**
 * Modo pruebas: se activa abriendo el juego con ?pruebas en el enlace. Quita las esperas de la siesta
 * y de la charla para poder probarlas seguidas. No cambia nada más ni queda guardado.
 */
export const MODO_PRUEBAS = typeof location !== 'undefined' && new URLSearchParams(location.search).has('pruebas');
if (MODO_PRUEBAS) {
  CONFIG.esperaDescansoMs = 0;
  CONFIG.esperaCharlaMs = 0;
}

/** Partida en curso, compartida por todas las escenas. */
export const juego: { e: Estado } = { e: cargar(Date.now()) };

export function guardarPartida(): void {
  guardar(juego.e);
}

export interface Paso {
  dia: ResultadoDia;
  subioEtapa: boolean;
}

/** Aplica el tiempo transcurrido, el día nuevo, la comunidad simulada y la meta. */
export function paso(ahora = Date.now()): Paso {
  const e = juego.e;
  avanzarTiempo(e, ahora);
  const dia = visitaDiaria(e, ahora);
  simularComunidad(e, ahora);
  const subioEtapa = comprobarMeta(e);
  guardarPartida();
  return { dia, subioEtapa };
}
