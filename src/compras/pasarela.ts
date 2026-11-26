import { registerPlugin } from '@capacitor/core';
import { esNativo } from '../nativo';
import { MODO_PRUEBAS } from '../juego';
import { PRODUCTOS, modoDePago } from '../core/compras';

/**
 * Pasarela de pago (R020). En la app publicada cobra Google Play (plugin RupertBilling). En una versión de prueba
 * (APK de prueba o la web con ?pruebas) la compra es simulada y no cobra nada. En la web normal no se vende nada.
 */
export interface CompraPlay {
  id: string;
  /** Identificador de esa compra (número de pedido): sirve para no acreditarla dos veces. */
  recibo: string;
  token: string;
}

export type EstadoPago = 'ok' | 'cancelada' | 'pendiente' | 'poseido' | 'error';

export interface Pasarela {
  modo: 'play' | 'simulada' | 'ninguna';
  precios(): Promise<Record<string, string>>;
  comprar(id: string): Promise<{ estado: EstadoPago; compra?: CompraPlay }>;
  pendientes(): Promise<CompraPlay[]>;
  cerrar(compra: CompraPlay): Promise<void>;
}

interface PluginBilling {
  info(): Promise<{ depuracion: boolean }>;
  precios(o: { ids: string }): Promise<{ precios: Record<string, string> }>;
  comprar(o: { id: string }): Promise<{ estado: EstadoPago; compra?: CompraPlay }>;
  pendientes(): Promise<{ compras: CompraPlay[] }>;
  cerrar(o: { token: string }): Promise<{ cerrada: boolean }>;
}

const IDS = PRODUCTOS.map((p) => p.id).join(',');

function crearPlay(plugin: PluginBilling): Pasarela {
  return {
    modo: 'play',
    precios: () => plugin.precios({ ids: IDS }).then((r) => r.precios ?? {}, () => ({})),
    comprar: (id) => plugin.comprar({ id }).catch(() => ({ estado: 'error' as const })),
    pendientes: () => plugin.pendientes().then((r) => r.compras ?? [], () => []),
    cerrar: (c) => plugin.cerrar({ token: c.token }).then(() => undefined, () => undefined),
  };
}

/** Compra de prueba: no cobra nada. Se acredita al instante, con un recibo nuevo cada vez. */
function crearSimulada(): Pasarela {
  let n = 0;
  return {
    modo: 'simulada',
    precios: () => Promise.resolve({}),
    comprar: (id) => Promise.resolve({ estado: 'ok' as const, compra: { id, recibo: `SIM.${Date.now()}.${n++}`, token: 'sim' } }),
    pendientes: () => Promise.resolve([]),
    cerrar: () => Promise.resolve(),
  };
}

const ninguna: Pasarela = {
  modo: 'ninguna',
  precios: () => Promise.resolve({}),
  comprar: () => Promise.resolve({ estado: 'error' as const }),
  pendientes: () => Promise.resolve([]),
  cerrar: () => Promise.resolve(),
};

let elegida: Promise<Pasarela> | null = null;

/** La pasarela de esta instalación (se decide una sola vez). */
export function pasarela(): Promise<Pasarela> {
  elegida ??= (async () => {
    const plugin = esNativo ? registerPlugin<PluginBilling>('RupertBilling') : null;
    let depuracion = false;
    try {
      depuracion = plugin ? (await plugin.info()).depuracion : false;
    } catch {
      return ninguna;
    }
    const modo = modoDePago({ nativo: esNativo, depuracion, pruebas: MODO_PRUEBAS });
    return modo === 'play' ? crearPlay(plugin!) : modo === 'simulada' ? crearSimulada() : ninguna;
  })();
  return elegida;
}
