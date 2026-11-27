/**
 * Reglas puras de tres changas: Repartir volantes, Arreglos y Cocinar recetas.
 * Sin Phaser: las escenas leen estos datos y las pruebas los verifican.
 */

type Azar = () => number;

// ——— Repartir volantes ———

export interface Peaton {
  /** Fila de la hoja de peatones (peaton0 ... peaton4). */
  hoja: number;
  nombre: string;
  /** Velocidad al caminar, px del mundo por segundo. */
  velocidad: number;
  /** Si acepta el volante cuando se lo dan a tiempo. */
  acepta: boolean;
  /** Lo que dice si no lo acepta. */
  excusa?: string;
}

export const PEATONES: Peaton[] = [
  { hoja: 0, nombre: 'oficinista', velocidad: 46, acepta: true },
  { hoja: 1, nombre: 'señora', velocidad: 32, acepta: true },
  { hoja: 2, nombre: 'joven', velocidad: 42, acepta: false, excusa: '¡No te escucha, tiene auriculares! Como todos.' },
  { hoja: 3, nombre: 'corredora', velocidad: 78, acepta: false, excusa: '¡No molestes a quien corre! Ella corre por gusto; yo, por deudas.' },
  { hoja: 4, nombre: 'señor', velocidad: 38, acepta: true },
];

export type EntregaVolante = 'entregado' | 'rechazado' | 'lejos';

export function entregarVolante(p: Peaton, enZona: boolean): { resultado: EntregaVolante; puntos: number } {
  if (!enZona) return { resultado: 'lejos', puntos: -1 };
  return p.acepta ? { resultado: 'entregado', puntos: 3 } : { resultado: 'rechazado', puntos: -2 };
}

/** Segundos entre un peatón y el siguiente: la plaza se llena a medida que pasa el tiempo. */
export function esperaPeaton(segundos: number): number {
  return Math.max(0.9, 2.2 - segundos * 0.03);
}

// ——— Changas de arreglos ———

export type Herramienta = 'martillo' | 'destornillador' | 'llave' | 'cinta';
export const HERRAMIENTAS: Herramienta[] = ['martillo', 'destornillador', 'llave', 'cinta'];

export interface Arreglo {
  objeto: string;
  herramienta: Herramienta;
  pedido: string;
}

export const ARREGLOS: Arreglo[] = [
  { objeto: 'silla', herramienta: 'martillo', pedido: 'Se le salió una pata a la silla.' },
  { objeto: 'canilla', herramienta: 'llave', pedido: 'La canilla gotea toda la noche.' },
  { objeto: 'radio', herramienta: 'cinta', pedido: 'La radio tiene el cable pelado.' },
  { objeto: 'puerta', herramienta: 'destornillador', pedido: 'Se aflojó la bisagra de la puerta.' },
  { objeto: 'paraguas', herramienta: 'cinta', pedido: 'Se partió una varilla del paraguas.' },
  { objeto: 'bici', herramienta: 'llave', pedido: 'A la bici se le sale la cadena.' },
];

/** Puntos por arreglo: más si fue rápido. */
export function puntosArreglo(bien: boolean, segundos: number): number {
  if (!bien) return -2;
  return segundos <= 3 ? 7 : 5;
}

/** Siguiente arreglo al azar, distinto del anterior. */
export function siguienteArreglo(anterior: string | null, azar: Azar = Math.random): Arreglo {
  const opciones = ARREGLOS.filter((a) => a.objeto !== anterior);
  return opciones[Math.floor(azar() * opciones.length)];
}

// ——— Cocinar recetas ———

export type Utensilio = 'olla' | 'sarten';
export const INGREDIENTES = ['arroz', 'fideos', 'tomate', 'cebolla', 'huevo', 'papa', 'zanahoria', 'carne'] as const;
export type Ingrediente = (typeof INGREDIENTES)[number];

export interface Receta {
  nombre: string;
  /** Imagen del plato terminado. */
  plato: string;
  utensilio: Utensilio;
  pasos: Ingrediente[];
}

export const RECETAS: Receta[] = [
  { nombre: 'Arroz con huevo', plato: 'plato_arroz', utensilio: 'olla', pasos: ['arroz', 'huevo'] },
  { nombre: 'Fideos con salsa', plato: 'plato_fideos', utensilio: 'olla', pasos: ['fideos', 'cebolla', 'tomate'] },
  { nombre: 'Guiso de carne', plato: 'plato_guiso', utensilio: 'olla', pasos: ['carne', 'cebolla', 'papa', 'zanahoria'] },
  { nombre: 'Tortilla de papas', plato: 'sarten', utensilio: 'sarten', pasos: ['papa', 'cebolla', 'huevo'] },
  { nombre: 'Bife con tomate', plato: 'sarten', utensilio: 'sarten', pasos: ['carne', 'tomate'] },
];

export type PasoCocina = 'bien' | 'listo' | 'mal';

/**
 * Lo que pasa al poner algo en el hornillo. `hechos` cuenta lo ya puesto: 0 es el utensilio;
 * después vienen los ingredientes en el orden de la receta.
 */
export function pasoCocina(r: Receta, hechos: number, elegido: string): PasoCocina {
  const esperado = hechos === 0 ? r.utensilio : r.pasos[hechos - 1];
  if (elegido !== esperado) return 'mal';
  return hechos === r.pasos.length ? 'listo' : 'bien';
}

export function puntosReceta(r: Receta): number {
  return r.pasos.length * 4 + 2;
}

export function siguienteReceta(anterior: string | null, azar: Azar = Math.random): Receta {
  const opciones = RECETAS.filter((r) => r.nombre !== anterior);
  return opciones[Math.floor(azar() * opciones.length)];
}
