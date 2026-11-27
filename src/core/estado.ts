import { DECORACIONES } from './decoracion';
import { CUPO_BARRIO, metasDeBarrio } from './barrios';

const DECORACION_IDS = new Set(DECORACIONES.map((d) => d.id));

/**
 * Estado de la partida y reglas puras (sin Phaser), para poder probarlas.
 * Todo el tiempo se mide en milisegundos (Date.now()).
 */

export type Comida = 'sandwich' | 'sopa' | 'manzana' | 'cafe';
export type Aseo = 'jabon' | 'shampoo' | 'toalla';
export type Objeto = Comida | Aseo;

export interface Articulo {
  nombre: string;
  precio: number;
  hambre?: number;
  higiene?: number;
  animo?: number;
}

export const ARTICULOS: Record<Objeto, Articulo> = {
  manzana: { nombre: 'Manzana', precio: 12, hambre: 15 },
  sandwich: { nombre: 'Sándwich', precio: 30, hambre: 35, animo: 5 },
  sopa: { nombre: 'Sopa caliente', precio: 45, hambre: 50, animo: 10 },
  cafe: { nombre: 'Café', precio: 15, hambre: 5, animo: 15 },
  jabon: { nombre: 'Jabón', precio: 25, higiene: 40 },
  shampoo: { nombre: 'Shampoo', precio: 35, higiene: 50, animo: 5 },
  toalla: { nombre: 'Toalla limpia', precio: 15, higiene: 20, animo: 5 },
};

export const COMIDAS: Comida[] = ['manzana', 'sandwich', 'sopa', 'cafe'];
export const ASEO: Aseo[] = ['jabon', 'shampoo', 'toalla'];

/** Configuración del prototipo. En la fase 2 estos valores vienen del servidor (Remote Config). */
export const CONFIG = {
  /** Puntos de Ayuda que el barrio tiene que juntar para pasar de etapa (índice = etapa actual), según su cupo (R021). */
  metas: metasDeBarrio(CUPO_BARRIO),
  /** Monedas por cada Punto de Ayuda aportado gratis. */
  monedasPorPA: 10,
  /** Tope diario de PA aportados con monedas por jugador. */
  topeDiarioPA: 60,
  /**
   * Vecinos simulados del prototipo: PA por minuto real que aporta el resto del barrio (se reemplaza por Firebase
   * en la fase 2). 8 PA/min ≈ 11.500 PA por día, unos 23 PA diarios por cada uno de 500 vecinos.
   */
  simuladoPAporMinuto: 8,
  /** Vecinos activos del barrio simulado del prototipo. */
  vecinosSimulados: 384,
  /** Pérdida por hora de cada barra. */
  bajaPorHora: { hambre: 5, higiene: 3, animo: 2 },
  /** Horas máximas que se descuentan al volver (para no castigar ausencias largas). */
  horasMaxAusencia: 48,
  /** Monedas de regalo por entrar cada día, según la racha (tope en el último valor). */
  regaloDiario: [10, 15, 20, 25, 30, 40, 50],
  /** Espera entre charlas que suben el ánimo y entre descansos. */
  esperaCharlaMs: 60 * 60 * 1000,
  esperaDescansoMs: 4 * 60 * 60 * 1000,
};

export interface Estado {
  v: 1;
  monedas: number;
  hambre: number;
  higiene: number;
  animo: number;
  /** Último momento en que se aplicó el paso del tiempo. */
  ultima: number;
  inventario: Record<Objeto, number>;
  /** Total de PA aportados por este jugador (para insignias y ranking). */
  aportado: number;
  aportadoHoy: number;
  /** Día (AAAA-MM-DD local) al que corresponde aportadoHoy y recogidos. */
  dia: string;
  racha: number;
  recogidos: string[];
  ultimaCharla: number;
  ultimoDescanso: number;
  /** Fondo común (simulado en el prototipo). */
  fondo: number;
  etapa: number;
  /** Último momento en que se sumó la comunidad simulada. */
  ultimaSimulacion: number;
  /** Decoración de la casa: objetos comprados y qué hay en cada hueco (estante, mesa...). */
  decoraciones: string[];
  casa: Record<string, string>;
  /** Insignias ganadas (por aportes gratis acumulados y por compras). */
  insignias: string[];
  /** Compras con dinero real: recibos ya acreditados (para no repetir) y compras de hoy (tope diario). */
  compras: { dia: string; hoy: number; recibos: string[] };
  /** PA comprados que todavía no se enviaron al servidor (fase 2: Firebase). */
  paraServidor: number;
  /** Etapa durante la que está activo el pase de temporada (doble de monedas en changas), o -1. */
  pase: number;
  /** Barrio del jugador (R021). Lo asigna el servidor; sin conexión, el 1 simulado. */
  barrio: number;
  /** Aportes con monedas que todavía no llegaron al servidor (se reintentan al reconectar). */
  pendientes: { id: string; pa: number }[];
  /** Ya vio el tutorial de comandos (R024). */
  tutorial: boolean;
  /** Ya vio el epílogo de la primera parte (R041). */
  finalVisto: boolean;
  /** Consejos en contexto ya vistos (R042). */
  consejos: string[];
  /** Mejor puntaje en cada changa (por nombre de escena), R041. */
  records: Record<string, number>;
}

const BARRAS = ['hambre', 'higiene', 'animo'] as const;

/** Consejos que aparecen la primera vez que hacen falta (R042), en vez de explicarlo todo al empezar. */
export const CONSEJOS = ['necesidades', 'tienda', 'fondo', 'hablar', 'menu'] as const;
export type Consejo = (typeof CONSEJOS)[number];

/** Qué consejo toca ahora (o ninguno): el primero cuya situación se da y que todavía no se vio. */
export function consejoPendiente(e: Estado): Consejo | null {
  const visto = (c: Consejo) => e.consejos.includes(c);
  const hayComida = e.inventario.sandwich + e.inventario.sopa + e.inventario.manzana + e.inventario.cafe > 0;
  if (!visto('necesidades') && Math.min(e.hambre, e.higiene, e.animo) < 40) return 'necesidades';
  if (!visto('tienda') && !hayComida && e.hambre < 50 && e.monedas >= ARTICULOS.manzana.precio) return 'tienda';
  if (!visto('fondo') && e.aportado === 0 && e.monedas >= CONFIG.monedasPorPA * 5) return 'fondo';
  if (!visto('hablar') && e.animo < 50) return 'hablar';
  if (!visto('menu') && Object.keys(e.records).length >= 2) return 'menu';
  return null;
}

export function diaDe(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function limitar(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function nuevoEstado(ahora: number): Estado {
  return {
    v: 1,
    monedas: 40,
    hambre: 45,
    higiene: 35,
    animo: 55,
    ultima: ahora,
    inventario: { sandwich: 1, sopa: 0, manzana: 0, cafe: 0, jabon: 0, shampoo: 0, toalla: 0 },
    aportado: 0,
    aportadoHoy: 0,
    dia: diaDe(ahora),
    racha: 1,
    recogidos: [],
    ultimaCharla: 0,
    ultimoDescanso: 0,
    fondo: 0,
    etapa: 0,
    ultimaSimulacion: ahora,
    decoraciones: [],
    casa: {},
    insignias: [],
    compras: { dia: diaDe(ahora), hoy: 0, recibos: [] },
    paraServidor: 0,
    pase: -1,
    barrio: 1,
    pendientes: [],
    tutorial: false,
    finalVisto: false,
    consejos: [],
    records: {},
  };
}

/** Repara una partida guardada: completa campos que falten y descarta valores imposibles. */
export function normalizar(dato: unknown, ahora: number): Estado {
  const base = nuevoEstado(ahora);
  if (!dato || typeof dato !== 'object') return base;
  const d = dato as Partial<Estado>;
  const num = (x: unknown, def: number) => (typeof x === 'number' && Number.isFinite(x) ? x : def);
  const inv = { ...base.inventario };
  if (d.inventario && typeof d.inventario === 'object') {
    for (const k of Object.keys(inv) as Objeto[]) inv[k] = Math.max(0, Math.floor(num(d.inventario[k], 0)));
  }
  return {
    ...base,
    monedas: Math.max(0, Math.floor(num(d.monedas, base.monedas))),
    hambre: limitar(num(d.hambre, base.hambre)),
    higiene: limitar(num(d.higiene, base.higiene)),
    animo: limitar(num(d.animo, base.animo)),
    ultima: Math.min(num(d.ultima, ahora), ahora),
    inventario: inv,
    aportado: Math.max(0, num(d.aportado, 0)),
    aportadoHoy: Math.max(0, num(d.aportadoHoy, 0)),
    dia: typeof d.dia === 'string' ? d.dia : base.dia,
    racha: Math.max(1, Math.floor(num(d.racha, 1))),
    recogidos: Array.isArray(d.recogidos) ? d.recogidos.filter((x) => typeof x === 'string') : [],
    ultimaCharla: num(d.ultimaCharla, 0),
    ultimoDescanso: num(d.ultimoDescanso, 0),
    fondo: Math.max(0, num(d.fondo, 0)),
    etapa: Math.max(0, Math.min(CONFIG.metas.length, Math.floor(num(d.etapa, 0)))),
    ultimaSimulacion: Math.min(num(d.ultimaSimulacion, ahora), ahora),
    // Solo se conservan objetos que siguen en el catálogo (los que se quitaron dejan de aparecer).
    decoraciones: Array.isArray(d.decoraciones) ? [...new Set(d.decoraciones.filter((x) => typeof x === 'string' && DECORACION_IDS.has(x)))] : [],
    casa:
      d.casa && typeof d.casa === 'object'
        ? Object.fromEntries(Object.entries(d.casa).filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && DECORACION_IDS.has(v)))
        : {},
    insignias: Array.isArray(d.insignias) ? [...new Set(d.insignias.filter((x) => typeof x === 'string'))] : [],
    compras: {
      dia: typeof d.compras?.dia === 'string' ? d.compras.dia : base.compras.dia,
      hoy: Math.max(0, Math.floor(num(d.compras?.hoy, 0))),
      recibos: Array.isArray(d.compras?.recibos) ? d.compras.recibos.filter((x) => typeof x === 'string').slice(-100) : [],
    },
    paraServidor: Math.max(0, num(d.paraServidor, 0)),
    pase: Math.floor(num(d.pase, -1)),
    barrio: Math.max(0, Math.floor(num(d.barrio, 1))),
    pendientes: Array.isArray(d.pendientes)
      ? d.pendientes.filter((x) => x && typeof x.id === 'string' && typeof x.pa === 'number' && x.pa > 0).slice(-50)
      : [],
    // Las partidas guardadas de antes del tutorial no lo muestran solas (se puede ver desde Ajustes).
    tutorial: typeof d.tutorial === 'boolean' ? d.tutorial : true,
    finalVisto: d.finalVisto === true,
    // Las partidas de antes ya vieron el tutorial largo, que explicaba todo: no reciben los consejos.
    consejos: Array.isArray(d.consejos)
      ? d.consejos.filter((x) => typeof x === 'string')
      : d.tutorial === false ? [] : [...CONSEJOS],
    records:
      d.records && typeof d.records === 'object'
        ? Object.fromEntries(Object.entries(d.records).filter(([k, v]) => typeof k === 'string' && typeof v === 'number' && Number.isFinite(v) && v > 0))
        : {},
  };
}

/** Aplica el paso del tiempo a las barras de cuidado. */
export function avanzarTiempo(e: Estado, ahora: number): void {
  const horas = Math.min(Math.max(0, ahora - e.ultima) / 3_600_000, CONFIG.horasMaxAusencia);
  if (horas > 0) {
    const b = CONFIG.bajaPorHora;
    e.hambre = limitar(e.hambre - b.hambre * horas);
    e.higiene = limitar(e.higiene - b.higiene * horas);
    // El ánimo baja el doble si Rupert tiene hambre o está sucio.
    const extra = e.hambre < 30 || e.higiene < 30 ? 2 : 1;
    e.animo = limitar(e.animo - b.animo * extra * horas);
  }
  e.ultima = Math.max(e.ultima, ahora);
}

export interface ResultadoDia {
  nuevoDia: boolean;
  regalo: number;
}

/** Cambio de día: reinicia topes diarios, objetos para recoger y actualiza la racha. */
export function visitaDiaria(e: Estado, ahora: number): ResultadoDia {
  const hoy = diaDe(ahora);
  if (hoy === e.dia) return { nuevoDia: false, regalo: 0 };
  const ayer = diaDe(new Date(`${hoy}T12:00:00`).getTime() - 86_400_000);
  e.racha = e.dia === ayer ? e.racha + 1 : 1;
  e.dia = hoy;
  e.aportadoHoy = 0;
  e.recogidos = [];
  const tabla = CONFIG.regaloDiario;
  const regalo = tabla[Math.min(e.racha, tabla.length) - 1];
  e.monedas += regalo;
  return { nuevoDia: true, regalo };
}

/** Rendimiento de Rupert según su cuidado: de 0,5 (descuidado) a 1 (todo lleno). */
export function multiplicador(e: Estado): number {
  const media = (e.hambre + e.higiene + e.animo) / 3;
  return 0.5 + 0.5 * (media / 100);
}

export function estaTriste(e: Estado): boolean {
  return BARRAS.some((b) => e[b] < 25);
}

export function comprar(e: Estado, o: Objeto): boolean {
  const precio = ARTICULOS[o].precio;
  if (e.monedas < precio) return false;
  e.monedas -= precio;
  e.inventario[o] += 1;
  return true;
}

export function usar(e: Estado, o: Objeto): boolean {
  if (e.inventario[o] <= 0) return false;
  const a = ARTICULOS[o];
  e.inventario[o] -= 1;
  e.hambre = limitar(e.hambre + (a.hambre ?? 0));
  e.higiene = limitar(e.higiene + (a.higiene ?? 0));
  e.animo = limitar(e.animo + (a.animo ?? 0));
  return true;
}

/** Charla con Rupert: sube el ánimo como mucho una vez por hora. */
export function charlar(e: Estado, ahora: number): boolean {
  if (ahora - e.ultimaCharla < CONFIG.esperaCharlaMs) return false;
  e.ultimaCharla = ahora;
  e.animo = limitar(e.animo + 5);
  return true;
}

export function descansar(e: Estado, ahora: number): boolean {
  if (ahora - e.ultimoDescanso < CONFIG.esperaDescansoMs) return false;
  e.ultimoDescanso = ahora;
  e.animo = limitar(e.animo + 20);
  return true;
}

/** Monedas que paga el minijuego: los puntos por el rendimiento de Rupert, nunca negativo. */
export function pagarMinijuego(e: Estado, puntos: number): number {
  const doble = e.pase === e.etapa ? 2 : 1;
  const pago = Math.max(0, Math.round(puntos * multiplicador(e) * doble));
  e.monedas += pago;
  return pago;
}

/** Anota el puntaje de una changa. Devuelve el récord anterior si se superó (0 si es el primero), o null si no. */
export function anotarRecord(e: Estado, changa: string, puntos: number): number | null {
  const antes = e.records[changa] ?? 0;
  if (puntos <= antes || puntos <= 0) return null;
  e.records[changa] = puntos;
  return antes;
}

export function recoger(e: Estado, id: string, monedas: number): boolean {
  if (e.recogidos.includes(id)) return false;
  e.recogidos.push(id);
  e.monedas += monedas;
  return true;
}

export function metaActual(e: Estado): number | null {
  return e.etapa < CONFIG.metas.length ? CONFIG.metas[e.etapa] : null;
}

export function puedeAportarPA(e: Estado): number {
  const porTope = CONFIG.topeDiarioPA - e.aportadoHoy;
  const porMonedas = Math.floor(e.monedas / CONFIG.monedasPorPA);
  return Math.max(0, Math.min(porTope, porMonedas));
}

/** Aporta PA con monedas. Devuelve los PA realmente aportados. */
export function aportar(e: Estado, pa: number): number {
  const n = Math.min(Math.floor(pa), puedeAportarPA(e));
  if (n <= 0) return 0;
  e.monedas -= n * CONFIG.monedasPorPA;
  e.aportadoHoy += n;
  e.aportado += n;
  e.fondo += n;
  return n;
}

/** Suma lo que aportó la comunidad simulada desde la última vez (solo prototipo). */
export function simularComunidad(e: Estado, ahora: number): number {
  const minutos = Math.floor(Math.max(0, ahora - e.ultimaSimulacion) / 60_000);
  if (minutos <= 0) return 0;
  const pa = Math.min(minutos, CONFIG.horasMaxAusencia * 60) * CONFIG.simuladoPAporMinuto;
  e.ultimaSimulacion += minutos * 60_000;
  e.fondo += pa;
  return pa;
}

/** Si el fondo llenó la meta, Rupert pasa de etapa y el fondo vuelve a empezar. Devuelve si subió. */
export function comprobarMeta(e: Estado): boolean {
  const meta = metaActual(e);
  if (meta === null || e.fondo < meta) return false;
  e.fondo -= meta;
  e.etapa += 1;
  return true;
}
