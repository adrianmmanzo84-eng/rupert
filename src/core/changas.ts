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

// ——— Reparar el auto ———

/** Cuántos colores de auto hay (motor_0 es el amarillo original). */
export const COLORES_AUTO = ['amarillo', 'rojo', 'azul', 'verde', 'violeta', 'blanco'] as const;

/** Color del auto que sigue: nunca el mismo que el anterior. */
export function colorAuto(anterior: number, azar: Azar = Math.random): number {
  const n = COLORES_AUTO.length;
  return anterior < 0 ? Math.floor(azar() * n) : (anterior + 1 + Math.floor(azar() * (n - 1))) % n;
}

/** Tipos de pieza del taller: cada uno tiene su repuesto en la bandeja. */
export const PIEZAS = [
  'bateria', 'bujia', 'filtro_aire', 'correa', 'manguera_principal', 'manguera_auxiliar',
  'tapa_radiador', 'cables_encendido', 'radiador', 'bloque_motor',
] as const;
export type Pieza = (typeof PIEZAS)[number];

export const NOMBRE_PIEZA: Record<Pieza, string> = {
  bateria: 'Batería',
  bujia: 'Bujía',
  filtro_aire: 'Filtro de aire',
  correa: 'Correa',
  manguera_principal: 'Manguera grande',
  manguera_auxiliar: 'Manguera chica',
  tapa_radiador: 'Tapa del radiador',
  cables_encendido: 'Cables de bujías',
  radiador: 'Radiador',
  bloque_motor: 'Bloque del motor',
};

/** Una pieza montada en el vano: su lugar en la imagen original de 1536 × 1024 (orden de dibujo, de atrás hacia adelante). */
export interface CapaTaller {
  id: string;
  pieza: Pieza;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export const ANCHO_VANO = 1536;
export const ALTO_VANO = 1024;
/** Ancho con que se muestra el vano, en px del mundo (480 × 270). */
export const ANCHO_VANO_MUNDO = 340;

/** Las 13 piezas del vano; las cuatro bujías se rompen cada una por su lado. */
export const CAPAS_TALLER: readonly CapaTaller[] = [
  { id: 'correa_01', pieza: 'correa', x: 971, y: 402, ancho: 65, alto: 167 },
  { id: 'manguera_auxiliar_02', pieza: 'manguera_auxiliar', x: 1054, y: 539, ancho: 127, alto: 90 },
  { id: 'bloque_motor_03', pieza: 'bloque_motor', x: 512, y: 391, ancho: 485, alto: 319 },
  { id: 'bateria_04', pieza: 'bateria', x: 263, y: 459, ancho: 222, alto: 173 },
  { id: 'filtro_aire_05', pieza: 'filtro_aire', x: 631, y: 285, ancho: 285, alto: 113 },
  { id: 'bujia_06', pieza: 'bujia', x: 614, y: 417, ancho: 22, alto: 52 },
  { id: 'bujia_07', pieza: 'bujia', x: 709, y: 417, ancho: 22, alto: 52 },
  { id: 'bujia_08', pieza: 'bujia', x: 799, y: 417, ancho: 22, alto: 52 },
  { id: 'bujia_09', pieza: 'bujia', x: 895, y: 417, ancho: 22, alto: 52 },
  { id: 'cables_encendido_10', pieza: 'cables_encendido', x: 482, y: 321, ancho: 407, alto: 102 },
  { id: 'radiador_11', pieza: 'radiador', x: 508, y: 610, ancho: 525, alto: 184 },
  { id: 'manguera_principal_12', pieza: 'manguera_principal', x: 825, y: 563, ancho: 263, alto: 87 },
  { id: 'tapa_radiador_13', pieza: 'tapa_radiador', x: 728, y: 599, ancho: 82, alto: 42 },
];

/** Cuántas piezas gastadas trae cada auto: más a medida que se arreglan autos y en la etapa 9. */
export function cantidadAverias(autos: number, etapa: number): number {
  return Math.min(4, 1 + Math.floor(autos / 2) + (etapa >= 9 ? 1 : 0));
}

/** Ids de las piezas gastadas de un auto (distintas entre sí). */
export function averias(n: number, azar: Azar = Math.random): string[] {
  return mezclar(CAPAS_TALLER, azar).slice(0, n).map((c) => c.id);
}

export function puntosAuto(piezas: number): number {
  return piezas * 6 + 2;
}
