import { CONFIG, avanzarTiempo, comprobarMeta, type Estado, simularComunidad, visitaDiaria, type ResultadoDia } from './core/estado';
import { cargar, guardar } from './core/guardado';
import { diaDe } from './core/estado';
import { type EventoMision, type Mision, type Misiones, avanzarMisiones, generarMisiones } from './core/misiones';
import { MINIJUEGOS, estadoMinijuego } from './core/minijuegos';
import { type AporteVecino, CUPO_BARRIO, registroSimulado } from './core/barrios';

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
export const juego: {
  e: Estado;
  subioPendiente: boolean;
  /** Conectado al servidor de barrios (R022): el fondo y la etapa vienen de ahí y no se simula el barrio. */
  enLinea: boolean;
  vecinos: number;
  cupo: number;
  /** Últimos aportes del barrio, del servidor (R043). Sin servidor se simulan al mostrarlos. */
  registro: AporteVecino[];
  /** Apodo de este jugador en el barrio (lo da el servidor). */
  apodo: string;
  /** Aportes propios de esta sesión, para verlos en el registro enseguida. */
  propios: AporteVecino[];
} = { e: cargar(Date.now()), subioPendiente: false, enLinea: false, vecinos: CONFIG.vecinosSimulados, cupo: CUPO_BARRIO, registro: [], apodo: '', propios: [] };

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
  if (!juego.enLinea) simularComunidad(e, ahora);
  const subioEtapa = comprobarMeta(e);
  guardarPartida();
  return { dia, subioEtapa };
}

// ——— Misiones diarias (R043) ———

/** Avisos para las escenas cuando se completa una misión (la escena activa muestra un cartelito). */
export const alCompletarMision: ((m: Mision) => void)[] = [];

/** Las misiones de hoy (las crea si cambió el día o la etapa sin haber empezado). */
export function misionesDeHoy(): Misiones {
  const e = juego.e;
  const hoy = diaDe(Date.now());
  if (!e.misiones || e.misiones.dia !== hoy) {
    const changas = MINIJUEGOS.filter((m) => m.escena && estadoMinijuego(m, e.etapa) === 'disponible').map((m) => ({ escena: m.escena!, nombre: m.nombre }));
    e.misiones = generarMisiones(hoy, e.etapa, changas, Object.keys(e.records).length > 0);
    guardarPartida();
  }
  return e.misiones;
}

/** Algo pasó en el juego: avanza las misiones que correspondan. */
export function progresoMision(evento: EventoMision, cantidad = 1, changa?: string): void {
  if (!juego.e.tutorial) return;
  const hechas = avanzarMisiones(misionesDeHoy(), evento, cantidad, changa);
  guardarPartida();
  for (const m of hechas) for (const f of alCompletarMision) f(m);
}

/** Registro para mostrar (R043): el del servidor o, sin conexión, uno simulado; con los aportes propios. */
export function registroDelBarrio(ahora = Date.now()): (AporteVecino & { mio?: boolean })[] {
  const base = juego.enLinea ? juego.registro : registroSimulado(ahora);
  const propios = juego.propios.map((a) => ({ ...a, mio: true }));
  // Con servidor, los propios ya vienen en la lista (con el apodo del jugador): se marcan en vez de repetirlos.
  const lista = juego.enLinea ? base.map((a) => (a.apodo === juego.apodo ? { ...a, mio: true } : a)) : [...base, ...propios];
  return lista.sort((a, b) => b.en - a.en).slice(0, 8);
}
