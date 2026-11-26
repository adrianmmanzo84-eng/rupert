/**
 * Reglas puras de cuatro changas: Repartir volantes, Arreglos, Cocinar recetas y Reparar el auto.
 * Sin Phaser: las escenas leen estos datos y las pruebas los verifican.
 */

type Azar = () => number;

function mezclar<T>(xs: readonly T[], azar: Azar): T[] {
  const r = [...xs];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

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
  { hoja: 2, nombre: 'joven', velocidad: 42, acepta: false, excusa: '¡No te escucha, tiene auriculares!' },
  { hoja: 3, nombre: 'corredora', velocidad: 78, acepta: false, excusa: '¡No molestes a quien corre!' },
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

// ——— Reparar el auto ———

export const PIEZAS = ['bateria', 'bujia', 'filtro', 'correa', 'manguera', 'tapa'] as const;
export type Pieza = (typeof PIEZAS)[number];

export const NOMBRE_PIEZA: Record<Pieza, string> = {
  bateria: 'Batería',
  bujia: 'Bujías',
  filtro: 'Filtro de aire',
  correa: 'Correa',
  manguera: 'Manguera',
  tapa: 'Tapa del radiador',
};

/** Dónde va cada pieza en el dibujo del motor (px de motor.png, 300 × 229). */
export const LUGAR_PIEZA: Record<Pieza, { x: number; y: number }> = {
  bateria: { x: 49, y: 121 },
  bujia: { x: 147, y: 117 },
  filtro: { x: 151, y: 74 },
  correa: { x: 243, y: 127 },
  manguera: { x: 205, y: 80 },
  tapa: { x: 151, y: 158 },
};

/** Cuántas piezas gastadas trae cada auto: más a medida que se arreglan autos y en la etapa 9. */
export function cantidadAverias(autos: number, etapa: number): number {
  return Math.min(4, 1 + Math.floor(autos / 2) + (etapa >= 9 ? 1 : 0));
}

export function averias(n: number, azar: Azar = Math.random): Pieza[] {
  return mezclar(PIEZAS, azar).slice(0, n);
}

export function puntosAuto(piezas: number): number {
  return piezas * 6 + 2;
}
