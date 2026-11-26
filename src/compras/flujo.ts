import { App } from '@capacitor/app';
import { acreditar, vetoDeCompra } from '../core/compras';
import { comprobarMeta } from '../core/estado';
import { guardarPartida, juego } from '../juego';
import { esNativo } from '../nativo';
import { type CompraPlay, pasarela } from './pasarela';

/**
 * Flujo de una compra (R020): confirmación en pantalla → ventana de pago de Google Play → acreditar y guardar →
 * cerrar (consumir) la compra en Google Play. Se acredita antes de cerrar: si la app se corta en medio, la compra
 * sigue abierta en Google Play y se entrega una sola vez la próxima vez que se abre el juego.
 */
export type ResultadoCompra = 'ok' | 'cancelada' | 'pendiente' | 'error' | 'limite' | 'pase_activo' | 'noDisponible';

let ocupado = false;

/** Acredita una compra y la cierra en Google Play. */
export async function entregar(compra: CompraPlay): Promise<'ok' | 'repetida' | 'error'> {
  const r = acreditar(juego.e, compra.id, compra.recibo, Date.now());
  if (r === 'desconocido') return 'error';
  if (r === 'ok') {
    // Si con esta ayuda se llenó la meta, Rupert sube de etapa (el hogar lo celebra al volver).
    if (comprobarMeta(juego.e)) juego.subioPendiente = true;
  }
  guardarPartida();
  await (await pasarela()).cerrar(compra);
  return r;
}

/** Compras cobradas que quedaron sin entregar. Devuelve los ids de lo que se entregó ahora. */
export async function recuperarPendientes(): Promise<string[]> {
  const entregadas: string[] = [];
  for (const c of await (await pasarela()).pendientes()) if ((await entregar(c)) === 'ok') entregadas.push(c.id);
  return entregadas;
}

/** Hace la compra (el jugador ya la confirmó en pantalla). */
export async function comprarProducto(id: string): Promise<ResultadoCompra> {
  const pas = await pasarela();
  if (pas.modo === 'ninguna') return 'noDisponible';
  const veto = vetoDeCompra(juego.e, id, Date.now());
  if (veto === 'limite' || veto === 'pase_activo') return veto;
  if (veto || ocupado) return 'error';
  ocupado = true;
  try {
    const r = await pas.comprar(id);
    if (r.estado === 'ok' && r.compra) return (await entregar(r.compra)) === 'error' ? 'error' : 'ok';
    if (r.estado === 'poseido') return (await recuperarPendientes()).length ? 'ok' : 'error';
    return r.estado === 'cancelada' ? 'cancelada' : r.estado === 'pendiente' ? 'pendiente' : 'error';
  } finally {
    ocupado = false;
  }
}

/** Al abrir la app y cada vez que vuelve al primer plano, entrega lo que haya quedado pendiente. */
export function iniciarCompras(alEntregar: (ids: string[]) => void): void {
  if (!esNativo) return;
  const revisar = () => {
    if (ocupado) return;
    void recuperarPendientes().then((ids) => ids.length && alEntregar(ids));
  };
  revisar();
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) revisar();
  });
}
