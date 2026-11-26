/**
 * Compras con dinero real e insignias (R020). El cobro lo hace Google Play; aquí está solo lo que decide el juego:
 * qué se vende, qué recibe el comprador, el tope diario, no acreditar dos veces el mismo recibo y las insignias.
 * Todo es ficción: se habla de "aportar al fondo de Rupert", nunca de donar.
 */
import { type Estado, type Objeto, diaDe } from './estado';

export interface Producto {
  /** Identificador del producto en Google Play Console (minúsculas, números y guiones bajos). */
  id: string;
  nombre: string;
  /** PA que suma al fondo común. */
  pa: number;
  monedas: number;
  objetos: Partial<Record<Objeto, number>>;
  insignia?: string;
  /** Activa el doble de monedas en las changas hasta que Rupert pase de etapa. */
  pase?: boolean;
  /** Precio de referencia en dólares, solo para mostrar si Google Play no responde. El cobro real usa el de Play. */
  usd: string;
  /** Lo que recibe el comprador, en una línea. */
  recibe: string;
}

export const PRODUCTOS: readonly Producto[] = [
  { id: 'ayuda_pequena', nombre: 'Ayuda pequeña', pa: 100, monedas: 0, objetos: { sandwich: 2 }, insignia: 'bronce', usd: '0,99', recibe: '2 sándwiches + insignia Bronce' },
  {
    id: 'ayuda_mediana', nombre: 'Ayuda mediana', pa: 330, monedas: 300, objetos: { sopa: 2, cafe: 2 }, insignia: 'plata', usd: '2,99',
    recibe: '2 sopas, 2 cafés, 300 monedas + insignia Plata',
  },
  {
    id: 'ayuda_grande', nombre: 'Ayuda grande', pa: 600, monedas: 800, objetos: { sopa: 3, jabon: 2, toalla: 2 }, insignia: 'oro', usd: '4,99',
    recibe: 'Pack de comida y aseo, 800 monedas + insignia Oro',
  },
  { id: 'monedas_1000', nombre: '1000 monedas', pa: 0, monedas: 1000, objetos: {}, usd: '0,99', recibe: '1000 monedas para tu Rupert' },
  {
    id: 'pase_temporada', nombre: 'Pase de temporada', pa: 200, monedas: 0, objetos: {}, insignia: 'marco_dorado', pase: true, usd: '4,99',
    recibe: 'Doble de monedas hasta la próxima meta + marco dorado',
  },
];

/** Compras por día que se permiten (protección para jugadores jóvenes y familias). */
export const MAX_POR_DIA = 5;

export const productoDe = (id: string): Producto | undefined => PRODUCTOS.find((p) => p.id === id);

export type Veto = 'limite' | 'pase_activo' | 'desconocido';

/** ¿Se puede empezar esta compra ahora? null si sí. */
export function vetoDeCompra(e: Estado, id: string, ahora: number): Veto | null {
  const p = productoDe(id);
  if (!p) return 'desconocido';
  if (p.pase && e.pase === e.etapa) return 'pase_activo';
  if (comprasHoy(e, ahora) >= MAX_POR_DIA) return 'limite';
  return null;
}

export function comprasHoy(e: Estado, ahora: number): number {
  return e.compras.dia === diaDe(ahora) ? e.compras.hoy : 0;
}

/**
 * Acredita una compra ya cobrada por Google Play. `recibo` identifica esa compra: si ya se acreditó, no se repite.
 * Los PA comprados no tienen tope diario y quedan anotados para mandarlos al servidor (fase 2).
 */
export function acreditar(e: Estado, id: string, recibo: string, ahora: number): 'ok' | 'repetida' | 'desconocido' {
  const p = productoDe(id);
  if (!p) return 'desconocido';
  if (e.compras.recibos.includes(recibo)) return 'repetida';
  const hoy = diaDe(ahora);
  if (e.compras.dia !== hoy) e.compras = { ...e.compras, dia: hoy, hoy: 0 };
  e.compras.hoy += 1;
  e.compras.recibos = [...e.compras.recibos, recibo].slice(-100);
  e.monedas += p.monedas;
  for (const [o, n] of Object.entries(p.objetos) as [Objeto, number][]) e.inventario[o] += n;
  e.fondo += p.pa;
  e.aportado += p.pa;
  e.paraServidor += p.pa;
  if (p.pase) e.pase = e.etapa;
  if (p.insignia) ganarInsignia(e, p.insignia);
  revisarInsignias(e);
  return 'ok';
}

// ——— Insignias ———

export interface Insignia {
  id: string;
  nombre: string;
  /** Cómo se gana, para mostrarla bloqueada. */
  como: string;
  /** Color de la medalla (se dibuja con formas mientras no haya arte propio). */
  color: number;
  /** PA aportados en total que la desbloquean (las de compra no tienen). */
  pa?: number;
}

export const INSIGNIAS: readonly Insignia[] = [
  { id: 'vecino', nombre: 'Vecino', como: 'Aporta 10 PA', color: 0x8fb8de, pa: 10 },
  { id: 'amigo', nombre: 'Amigo de Rupert', como: 'Aporta 100 PA', color: 0x7fd16b, pa: 100 },
  { id: 'pilar', nombre: 'Pilar del barrio', como: 'Aporta 500 PA', color: 0xc77dff, pa: 500 },
  { id: 'leyenda', nombre: 'Leyenda', como: 'Aporta 2000 PA', color: 0xff7a6b, pa: 2000 },
  { id: 'bronce', nombre: 'Bronce', como: 'Ayuda pequeña', color: 0xcd7f32 },
  { id: 'plata', nombre: 'Plata', como: 'Ayuda mediana', color: 0xc0c7d0 },
  { id: 'oro', nombre: 'Oro', como: 'Ayuda grande', color: 0xffd25a },
  { id: 'marco_dorado', nombre: 'Marco dorado', como: 'Pase de temporada', color: 0xffb347 },
];

function ganarInsignia(e: Estado, id: string): boolean {
  if (e.insignias.includes(id)) return false;
  e.insignias = [...e.insignias, id];
  return true;
}

/** Da las insignias por PA aportados que correspondan. Devuelve las nuevas. */
export function revisarInsignias(e: Estado): Insignia[] {
  return INSIGNIAS.filter((i) => i.pa !== undefined && e.aportado >= i.pa && ganarInsignia(e, i.id));
}

/** Modo de pago según dónde corre el juego: Google Play en la app publicada, simulado en versiones de prueba. */
export function modoDePago(o: { nativo: boolean; depuracion: boolean; pruebas: boolean }): 'play' | 'simulada' | 'ninguna' {
  if (o.nativo) return o.depuracion ? 'simulada' : 'play';
  return o.pruebas ? 'simulada' : 'ninguna';
}
