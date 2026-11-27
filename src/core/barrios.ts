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
  return id === 0 ? 'Barrio de prueba' : `Barrio ${id}`;
}

// ——— Registro del barrio (R043) ———

/** Un aporte del barrio, para mostrar quién ayudó (con apodo, nunca con datos personales). */
export interface AporteVecino {
  apodo: string;
  pa: number;
  /** Momento del aporte (ms). */
  en: number;
}

const ANIMALES = ['Gato', 'Paloma', 'Perro', 'Gorrión', 'Tortuga', 'Ratón', 'Hornero', 'Caracol', 'Carpincho', 'Cotorra', 'Sapo', 'Bicho bolita'];
const LUGARES_APODO = ['del Kiosco', 'de la Fuente', 'del Tercero B', 'de la Esquina', 'del Almacén', 'de la Plaza', 'del Balcón', 'del Colectivo', 'de la Feria', 'del Techo', 'de la Vereda', 'del Quinto Piso'];

/**
 * Apodo de un vecino a partir de un número: «Gato del Kiosco», «Paloma de la Fuente»... Los inventa el
 * juego (el servidor lo asigna al crear la cuenta) para que el registro no muestre nada personal.
 */
export function apodoDe(n: number): string {
  const k = Math.abs(Math.floor(n));
  return `${ANIMALES[k % ANIMALES.length]} ${LUGARES_APODO[Math.floor(k / ANIMALES.length) % LUGARES_APODO.length]}`;
}

/** Cada cuánto aporta un vecino simulado (sin servidor), en ms. */
const CADA_SIMULADO = 9 * 60_000;

function mezclar(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 2654435761);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * Registro del barrio simulado (sin servidor): un vecino inventado cada 9 minutos, siempre el mismo para el
 * mismo momento. Se muestra aclarando que es simulado.
 */
export function registroSimulado(ahora: number, cantidad = 8): AporteVecino[] {
  const ultimo = Math.floor(ahora / CADA_SIMULADO);
  return Array.from({ length: cantidad }, (_, i) => {
    const t = ultimo - i;
    const h = mezclar(t);
    return { apodo: apodoDe(h % 144), pa: 20 + (h % 5) * 10, en: t * CADA_SIMULADO + (h % 300) * 1000 };
  }).filter((a) => a.en <= ahora);
}

/** «hace 3 min», «hace 2 h», «ayer»… */
export function haceCuanto(en: number, ahora: number): string {
  const min = Math.max(0, Math.round((ahora - en) / 60_000));
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  return h < 48 ? 'ayer' : `hace ${Math.round(h / 24)} días`;
}
