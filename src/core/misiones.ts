/**
 * Misiones diarias (R043): tres por día, propias de cada jugador, con premio en monedas. Completar las tres
 * da un premio extra. Se eligen con una semilla del día, así que son las mismas aunque se reabra el juego.
 * Datos y reglas puras, sin Phaser.
 */

/** Cosas que pasan en el juego y hacen avanzar las misiones. */
export type EventoMision = 'changa' | 'monedas' | 'record' | 'aportar' | 'comer' | 'asearse' | 'hablar' | 'recoger';

export interface Mision {
  id: string;
  evento: EventoMision;
  /** Solo cuenta esta changa (nombre de escena). */
  changa?: string;
  texto: string;
  chiste: string;
  meta: number;
  progreso: number;
  premio: number;
  cobrada: boolean;
}

export interface Misiones {
  dia: string;
  lista: Mision[];
  /** Ya cobró el premio por completar las tres. */
  extra: boolean;
}

/** Premio por completar las tres misiones del día. */
export const PREMIO_TRES = 50;

interface Plantilla {
  id: string;
  evento: EventoMision;
  meta: (etapa: number) => number;
  premio: number;
  texto: (meta: number, changa?: string) => string;
  /** Lo que dice Rupert al cumplirla. */
  chiste: string;
  /** Necesita una changa concreta (la elige al azar entre las disponibles). */
  porChanga?: boolean;
  /** Solo si ya hay algún récord para superar. */
  conRecord?: boolean;
}

const PLANTILLAS: Plantilla[] = [
  { id: 'changas', evento: 'changa', meta: () => 3, premio: 30, texto: (n) => `Haz ${n} changas`, chiste: 'Cualquiera. Yo no discrimino trabajos.' },
  { id: 'esta', evento: 'changa', porChanga: true, meta: () => 2, premio: 25, texto: (n, c) => `Juega ${n} veces a «${c}»`, chiste: 'La práctica hace al maestro. A mí me hizo aprendiz, pero algo es algo.' },
  { id: 'ganar', evento: 'monedas', meta: (e) => 60 + 20 * e, premio: 35, texto: (n) => `Gana ${n} monedas en changas`, chiste: 'Monedas de verdad, no las de mi bolsillo imaginario.' },
  { id: 'aportar', evento: 'aportar', meta: (e) => (e >= 5 ? 20 : 10), premio: 30, texto: (n) => `Aporta ${n} PA al fondo`, chiste: 'El barrio te lo agradece. Yo, el doble.' },
  { id: 'comer', evento: 'comer', meta: () => 1, premio: 15, texto: () => 'Dale de comer a Rupert', chiste: 'O sea, a mí. Sin presión.' },
  { id: 'asearse', evento: 'asearse', meta: () => 1, premio: 15, texto: () => 'Que Rupert se asee', chiste: 'Los vecinos lo van a notar. Su nariz, sobre todo.' },
  { id: 'hablar', evento: 'hablar', meta: () => 1, premio: 10, texto: () => 'Charla con Rupert', chiste: 'Tengo temas. Pocos, pero los repito con ganas.' },
  { id: 'recoger', evento: 'recoger', meta: () => 1, premio: 15, texto: () => 'Encuentra algo tirado', chiste: 'Ojo de lince. O al menos de paloma.' },
  { id: 'record', evento: 'record', conRecord: true, meta: () => 1, premio: 40, texto: () => 'Supera uno de tus récords', chiste: 'Compites contra ti. Es el único rival que te deja ganar.' },
];

/** Número pseudoaleatorio con semilla (para que el mismo día dé las mismas misiones). */
function azarCon(semilla: string): () => number {
  let h = 2166136261;
  for (const ch of semilla) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * Las tres misiones de un día. `changas` = las disponibles ahora (escena y nombre); `hayRecords` dice si ya
 * hay algún récord para superar.
 */
export function generarMisiones(dia: string, etapa: number, changas: { escena: string; nombre: string }[], hayRecords: boolean): Misiones {
  const azar = azarCon(`${dia}:${etapa}`);
  const posibles = PLANTILLAS.filter((p) => (!p.conRecord || hayRecords) && (!p.porChanga || changas.length > 0));
  const lista: Mision[] = [];
  while (lista.length < 3 && posibles.length) {
    const p = posibles.splice(Math.floor(azar() * posibles.length), 1)[0];
    const meta = p.meta(etapa);
    const c = p.porChanga ? changas[Math.floor(azar() * changas.length)] : undefined;
    lista.push({ id: p.id, evento: p.evento, changa: c?.escena, texto: p.texto(meta, c?.nombre), chiste: p.chiste, meta, progreso: 0, premio: p.premio, cobrada: false });
  }
  return { dia, lista, extra: false };
}

/** Suma progreso a las misiones de ese evento. Devuelve las que se acaban de completar. */
export function avanzarMisiones(m: Misiones, evento: EventoMision, cantidad = 1, changa?: string): Mision[] {
  const hechas: Mision[] = [];
  for (const x of m.lista) {
    if (x.evento !== evento || x.progreso >= x.meta) continue;
    if (x.changa && x.changa !== changa) continue;
    x.progreso = Math.min(x.meta, x.progreso + cantidad);
    if (x.progreso >= x.meta) hechas.push(x);
  }
  return hechas;
}

/** Cobra una misión completa. Devuelve las monedas (0 si no se podía). */
export function cobrarMision(m: Misiones, id: string): number {
  const x = m.lista.find((y) => y.id === id);
  if (!x || x.cobrada || x.progreso < x.meta) return 0;
  x.cobrada = true;
  return x.premio;
}

/** Premio extra por las tres (una vez por día). */
export function cobrarExtra(m: Misiones): number {
  if (m.extra || m.lista.length < 3 || !m.lista.every((x) => x.cobrada)) return 0;
  m.extra = true;
  return PREMIO_TRES;
}

/** Cuántas hay listas para cobrar (para el aviso en el botón). */
export function porCobrar(m: Misiones): number {
  return m.lista.filter((x) => !x.cobrada && x.progreso >= x.meta).length + (!m.extra && m.lista.length === 3 && m.lista.every((x) => x.cobrada) ? 1 : 0);
}

/** Repara las misiones guardadas. */
export function normalizarMisiones(d: unknown): Misiones | null {
  if (!d || typeof d !== 'object') return null;
  const m = d as Partial<Misiones>;
  if (typeof m.dia !== 'string' || !Array.isArray(m.lista)) return null;
  const eventos = new Set(PLANTILLAS.map((p) => p.evento));
  const lista = m.lista.filter(
    (x): x is Mision => !!x && typeof x.id === 'string' && eventos.has(x.evento) && typeof x.texto === 'string' && typeof x.chiste === 'string' && typeof x.meta === 'number' && typeof x.progreso === 'number' && typeof x.premio === 'number',
  ).map((x) => ({ ...x, cobrada: x.cobrada === true, progreso: Math.max(0, Math.min(x.meta, x.progreso)) }));
  return { dia: m.dia, lista, extra: m.extra === true };
}
