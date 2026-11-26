/**
 * Servidor de Rupert (R022): barrios con su propio Rupert, en Cloudflare Workers + D1 (plan gratuito).
 * El juego nunca escribe el fondo directamente: todo pasa por aquí, que valida y suma.
 *
 *   POST /entrar   { jugador?, clave?, prueba? } → crea o reconoce al jugador y devuelve su barrio
 *   POST /aportar  { jugador, clave, pa, id }    → suma PA (con tope diario) al fondo del barrio
 *   GET  /barrio/:id                             → estado del barrio (etapa, fondo, meta, vecinos)
 */
import { CUPO_BARRIO, DIAS_INACTIVO, asignarBarrio, metasDeBarrio, type Barrio } from '../../src/core/barrios';

export interface Env {
  DB: D1Database;
}

/** Cupo del barrio de prueba (prueba cerrada de testers y versiones de prueba). */
const CUPO_PRUEBA = 20;
/** Tope diario de PA aportados con monedas por jugador (igual que en el juego). */
const TOPE_DIARIO_PA = 60;
/** Jugadores nuevos por dirección IP y por día (contra la creación masiva de cuentas). */
const NUEVOS_POR_IP = 10;
const DIA_MS = 86_400_000;

interface FilaBarrio {
  id: number;
  etapa: number;
  fondo: number;
  cupo: number;
  prueba: number;
}
interface FilaJugador {
  id: string;
  clave: string;
  barrio: number;
  ultima: number;
  aportado: number;
  dia: string;
  hoy: number;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(dato: unknown, estado = 200): Response {
  return new Response(JSON.stringify(dato), { status: estado, headers: { 'Content-Type': 'application/json', ...CORS } });
}

async function hash(texto: string): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function aleatorio(bytes = 24): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Día en Argentina (UTC−3), para que el tope diario cambie a medianoche de los jugadores. */
function diaDe(ms: number): string {
  return new Date(ms - 3 * 3_600_000).toISOString().slice(0, 10);
}

async function vecinosActivos(env: Env, barrio: number, ahora: number): Promise<number> {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM jugadores WHERE barrio = ? AND ultima > ?')
    .bind(barrio, ahora - DIAS_INACTIVO * DIA_MS)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

async function estadoBarrio(env: Env, id: number, ahora: number) {
  const b = await env.DB.prepare('SELECT id, etapa, fondo, cupo, prueba FROM barrios WHERE id = ?').bind(id).first<FilaBarrio>();
  if (!b) return null;
  const metas = metasDeBarrio(b.cupo);
  return {
    id: b.id,
    etapa: b.etapa,
    fondo: b.fondo,
    meta: b.etapa < metas.length ? metas[b.etapa] : null,
    cupo: b.cupo,
    vecinos: await vecinosActivos(env, b.id, ahora),
    prueba: b.prueba === 1,
  };
}

/** Barrio para un jugador nuevo: el más antiguo con lugar, o uno nuevo. El de prueba es el 0. */
async function elegirBarrio(env: Env, prueba: boolean, ahora: number): Promise<number> {
  if (prueba) {
    await env.DB.prepare('INSERT OR IGNORE INTO barrios (id, etapa, fondo, cupo, prueba, creado) VALUES (0, 0, 0, ?, 1, ?)').bind(CUPO_PRUEBA, ahora).run();
    return 0;
  }
  const { results } = await env.DB.prepare('SELECT id, cupo FROM barrios WHERE prueba = 0 ORDER BY id').all<{ id: number; cupo: number }>();
  const barrios: Barrio[] = [];
  for (const b of results) {
    barrios.push({ id: b.id, cupo: b.cupo, vecinos: await vecinosActivos(env, b.id, ahora) });
    // Con el primero que tiene lugar alcanza (se llenan en orden).
    if (barrios[barrios.length - 1].vecinos < b.cupo) break;
  }
  const elegido = asignarBarrio(barrios, CUPO_BARRIO);
  if (elegido.nuevo) {
    await env.DB.prepare('INSERT OR IGNORE INTO barrios (id, etapa, fondo, cupo, prueba, creado) VALUES (?, 0, 0, ?, 0, ?)')
      .bind(elegido.id, CUPO_BARRIO, ahora).run();
  }
  return elegido.id;
}

async function jugadorValido(env: Env, id: unknown, clave: unknown): Promise<FilaJugador | null> {
  if (typeof id !== 'string' || typeof clave !== 'string' || id.length > 64 || clave.length > 128) return null;
  const j = await env.DB.prepare('SELECT * FROM jugadores WHERE id = ?').bind(id).first<FilaJugador>();
  if (!j || j.clave !== (await hash(clave))) return null;
  return j;
}

async function entrar(env: Env, cuerpo: Record<string, unknown>, ip: string, ahora: number): Promise<Response> {
  const j = await jugadorValido(env, cuerpo.jugador, cuerpo.clave);
  if (j) {
    // Si estaba inactivo, vuelve a su barrio aunque esté lleno: nunca se echa a nadie.
    await env.DB.prepare('UPDATE jugadores SET ultima = ? WHERE id = ?').bind(ahora, j.id).run();
    return json({ jugador: j.id, barrio: await estadoBarrio(env, j.barrio, ahora) });
  }
  const recientes = await env.DB.prepare('SELECT COUNT(*) AS n FROM jugadores WHERE ip = ? AND creado > ?').bind(ip, ahora - DIA_MS).first<{ n: number }>();
  if ((recientes?.n ?? 0) >= NUEVOS_POR_IP) return json({ error: 'demasiados' }, 429);
  const barrio = await elegirBarrio(env, cuerpo.prueba === true, ahora);
  const id = aleatorio(12);
  const clave = aleatorio(24);
  await env.DB.prepare('INSERT INTO jugadores (id, clave, barrio, ultima, creado, ip) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, await hash(clave), barrio, ahora, ahora, ip).run();
  return json({ jugador: id, clave, barrio: await estadoBarrio(env, barrio, ahora) });
}

/**
 * Si el fondo alcanzó la meta, Rupert sube de etapa y el sobrante pasa a la meta siguiente. Cada cierre es
 * condicional (misma etapa y fondo suficiente), así dos aportes simultáneos no cierran la misma meta dos veces.
 */
async function cerrarMetas(env: Env, barrio: number): Promise<void> {
  for (let i = 0; i < 10; i++) {
    const b = await env.DB.prepare('SELECT etapa, fondo, cupo FROM barrios WHERE id = ?').bind(barrio).first<FilaBarrio>();
    if (!b) return;
    const metas = metasDeBarrio(b.cupo);
    if (b.etapa >= metas.length || b.fondo < metas[b.etapa]) return;
    await env.DB.prepare('UPDATE barrios SET fondo = fondo - ?, etapa = etapa + 1 WHERE id = ? AND etapa = ? AND fondo >= ?')
      .bind(metas[b.etapa], barrio, b.etapa, metas[b.etapa]).run();
  }
}

async function aportarPA(env: Env, cuerpo: Record<string, unknown>, ahora: number): Promise<Response> {
  const j = await jugadorValido(env, cuerpo.jugador, cuerpo.clave);
  if (!j) return json({ error: 'jugador' }, 401);
  const idAporte = cuerpo.id;
  const pedido = Math.floor(Number(cuerpo.pa));
  if (typeof idAporte !== 'string' || idAporte.length > 64 || !(pedido > 0)) return json({ error: 'datos' }, 400);
  const ya = await env.DB.prepare('SELECT pa FROM aportes WHERE id = ?').bind(`${j.id}:${idAporte}`).first<{ pa: number }>();
  if (ya) return json({ sumado: ya.pa, repetido: true, barrio: await estadoBarrio(env, j.barrio, ahora) });

  const dia = diaDe(ahora);
  const hoy = j.dia === dia ? j.hoy : 0;
  const pa = Math.max(0, Math.min(pedido, TOPE_DIARIO_PA - hoy));
  await env.DB.batch([
    env.DB.prepare('INSERT INTO aportes (id, jugador, pa, en) VALUES (?, ?, ?, ?)').bind(`${j.id}:${idAporte}`, j.id, pa, ahora),
    env.DB.prepare('UPDATE jugadores SET dia = ?, hoy = ?, aportado = aportado + ?, ultima = ? WHERE id = ?').bind(dia, hoy + pa, pa, ahora, j.id),
    // Suma relativa: dos aportes al mismo tiempo no se pisan.
    env.DB.prepare('UPDATE barrios SET fondo = fondo + ? WHERE id = ?').bind(pa, j.barrio),
  ]);
  await cerrarMetas(env, j.barrio);
  return json({ sumado: pa, barrio: await estadoBarrio(env, j.barrio, ahora) });
}

export default {
  async fetch(pedido: Request, env: Env): Promise<Response> {
    if (pedido.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(pedido.url);
    const ahora = Date.now();
    try {
      if (pedido.method === 'GET' && url.pathname === '/') return json({ servidor: 'rupert', ok: true });
      const m = url.pathname.match(/^\/barrio\/(\d+)$/);
      if (pedido.method === 'GET' && m) {
        const b = await estadoBarrio(env, Number(m[1]), ahora);
        return b ? json({ barrio: b }) : json({ error: 'barrio' }, 404);
      }
      if (pedido.method !== 'POST') return json({ error: 'ruta' }, 404);
      const cuerpo = (await pedido.json().catch(() => ({}))) as Record<string, unknown>;
      const ip = pedido.headers.get('CF-Connecting-IP') ?? '';
      if (url.pathname === '/entrar') return await entrar(env, cuerpo, ip, ahora);
      if (url.pathname === '/aportar') return await aportarPA(env, cuerpo, ahora);
      return json({ error: 'ruta' }, 404);
    } catch (e) {
      return json({ error: 'interno', detalle: String(e) }, 500);
    }
  },
};
