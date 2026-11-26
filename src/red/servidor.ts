import { registerPlugin } from '@capacitor/core';
import { metasDeBarrio } from '../core/barrios';
import { CONFIG } from '../core/estado';
import { MODO_PRUEBAS, guardarPartida, juego } from '../juego';
import { esNativo } from '../nativo';

/**
 * Conexión con el servidor de barrios (R022, Cloudflare Workers + D1). Sin dirección configurada o sin red,
 * el juego sigue como antes con el barrio simulado; al reconectar, envía los aportes que quedaron pendientes.
 */
export const SERVIDOR: string = (import.meta.env.VITE_SERVIDOR as string | undefined) ?? '';

const CLAVE_CUENTA = 'rupert.cuenta';

interface Cuenta {
  jugador: string;
  clave: string;
}

interface BarrioServidor {
  id: number;
  etapa: number;
  fondo: number;
  meta: number | null;
  cupo: number;
  vecinos: number;
  prueba: boolean;
}

function leerCuenta(): Cuenta | null {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CUENTA) ?? 'null') as Cuenta | null;
    return c && typeof c.jugador === 'string' && typeof c.clave === 'string' ? c : null;
  } catch {
    return null;
  }
}

function guardarCuenta(c: Cuenta): void {
  try {
    localStorage.setItem(CLAVE_CUENTA, JSON.stringify(c));
  } catch {
    /* sin almacenamiento: se pedirá una cuenta nueva la próxima vez */
  }
}

async function pedir<T>(ruta: string, cuerpo?: unknown): Promise<T | null> {
  if (!SERVIDOR) return null;
  try {
    const r = await fetch(`${SERVIDOR}${ruta}`, {
      method: cuerpo === undefined ? 'GET' : 'POST',
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

/** ¿Versión de prueba? (web con ?pruebas, modo desarrollo o APK de prueba): va al barrio de prueba. */
async function esPrueba(): Promise<boolean> {
  if (MODO_PRUEBAS || import.meta.env.DEV) return true;
  if (!esNativo) return false;
  try {
    return (await registerPlugin<{ info(): Promise<{ depuracion: boolean }> }>('RupertBilling').info()).depuracion;
  } catch {
    return false;
  }
}

/** Aplica el estado del barrio que manda el servidor (la verdad sobre etapa y fondo). */
function aplicar(b: BarrioServidor): void {
  const e = juego.e;
  juego.enLinea = true;
  juego.vecinos = b.vecinos;
  juego.cupo = b.cupo;
  CONFIG.metas = metasDeBarrio(b.cupo);
  // Si el barrio subió de etapa mientras no estabas, el hogar lo celebra.
  if (b.etapa > e.etapa) juego.subioPendiente = true;
  e.barrio = b.id;
  e.etapa = b.etapa;
  e.fondo = b.fondo;
  guardarPartida();
}

let sincronizando: Promise<boolean> | null = null;

/** Entra al servidor (crea la cuenta la primera vez), envía aportes pendientes y trae el barrio. */
export function sincronizar(): Promise<boolean> {
  sincronizando ??= (async () => {
    try {
      const cuenta = leerCuenta();
      const r = await pedir<{ jugador: string; clave?: string; barrio: BarrioServidor }>('/entrar', cuenta ?? { prueba: await esPrueba() });
      if (!r) {
        juego.enLinea = false;
        return false;
      }
      if (r.clave) guardarCuenta({ jugador: r.jugador, clave: r.clave });
      aplicar(r.barrio);
      await enviarPendientes();
      return true;
    } finally {
      sincronizando = null;
    }
  })();
  return sincronizando;
}

/** Manda al servidor los aportes con monedas que todavía no llegaron. */
async function enviarPendientes(): Promise<void> {
  const cuenta = leerCuenta();
  if (!cuenta) return;
  for (const p of [...juego.e.pendientes]) {
    const r = await pedir<{ sumado: number; barrio: BarrioServidor }>('/aportar', { ...cuenta, pa: p.pa, id: p.id });
    if (!r) return; // sin red: se reintenta la próxima vez
    juego.e.pendientes = juego.e.pendientes.filter((x) => x.id !== p.id);
    aplicar(r.barrio);
  }
}

/** Anota un aporte con monedas (ya descontado en el teléfono) y lo envía al barrio. */
export async function enviarAporte(pa: number): Promise<void> {
  juego.e.pendientes.push({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`, pa });
  guardarPartida();
  if (leerCuenta()) await enviarPendientes();
  else await sincronizar();
}

/** Sincroniza al abrir y cada minuto mientras el juego está abierto. */
export function iniciarServidor(alCambiar: () => void): void {
  if (!SERVIDOR) return;
  const vez = () => void sincronizar().then((ok) => ok && alCambiar());
  vez();
  setInterval(() => {
    if (document.visibilityState === 'visible') vez();
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') vez();
  });
}
