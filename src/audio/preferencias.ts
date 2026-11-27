/**
 * Preferencias del teléfono (R042): música, efectos y vibración. Son de este aparato, no de la partida:
 * borrar la partida no las cambia.
 */
export interface Preferencias {
  musica: boolean;
  efectos: boolean;
  vibracion: boolean;
  /** Avisos al teléfono (R043). */
  avisos: boolean;
}

const CLAVE = 'rupert.preferencias.v1';
const BASE: Preferencias = { musica: true, efectos: true, vibracion: true, avisos: true };
let cache: Preferencias | null = null;

export function leerPreferencias(texto: string | null): Preferencias {
  try {
    const d = texto ? (JSON.parse(texto) as Partial<Preferencias>) : {};
    return {
      musica: typeof d.musica === 'boolean' ? d.musica : BASE.musica,
      efectos: typeof d.efectos === 'boolean' ? d.efectos : BASE.efectos,
      vibracion: typeof d.vibracion === 'boolean' ? d.vibracion : BASE.vibracion,
      avisos: typeof d.avisos === 'boolean' ? d.avisos : BASE.avisos,
    };
  } catch {
    return { ...BASE };
  }
}

export function preferencias(): Preferencias {
  if (!cache) {
    let texto: string | null = null;
    try {
      texto = globalThis.localStorage?.getItem(CLAVE) ?? null;
    } catch {
      /* sin almacenamiento */
    }
    cache = leerPreferencias(texto);
  }
  return cache;
}

export function cambiarPreferencia(k: keyof Preferencias, v: boolean): Preferencias {
  cache = { ...preferencias(), [k]: v };
  try {
    globalThis.localStorage?.setItem(CLAVE, JSON.stringify(cache));
  } catch {
    /* sin almacenamiento: vale hasta cerrar */
  }
  return cache;
}
