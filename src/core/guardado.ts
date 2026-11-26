import { type Estado, normalizar } from './estado';

const CLAVE = 'rupert.partida.v1';

export function cargar(ahora: number, almacen: Storage | undefined = globalThis.localStorage): Estado {
  try {
    const texto = almacen?.getItem(CLAVE);
    return normalizar(texto ? JSON.parse(texto) : null, ahora);
  } catch {
    return normalizar(null, ahora);
  }
}

export function guardar(e: Estado, almacen: Storage | undefined = globalThis.localStorage): void {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(e));
  } catch {
    /* sin espacio o modo privado: se sigue jugando sin guardar */
  }
}
