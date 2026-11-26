/**
 * Catálogo de minijuegos ("changas"). Cada uno pertenece a un lugar de vida de Rupert y solo se juega
 * en las etapas indicadas: al mudarse, cambian las changas disponibles.
 */

export type LugarVida = 'callejon' | 'plaza' | 'ciudad' | 'pieza' | 'instituto' | 'taller' | 'casa';

export interface Minijuego {
  id: string;
  nombre: string;
  descripcion: string;
  lugar: LugarVida;
  /** Primera y última etapa (incluidas) en que está disponible. */
  desde: number;
  hasta: number;
  /** Escena de Phaser; si falta, todavía no está programado. */
  escena?: string;
}

export const LUGARES: Record<LugarVida, string> = {
  callejon: 'Callejón',
  plaza: 'Plaza',
  ciudad: 'Ciudad',
  pieza: 'Pieza alquilada',
  instituto: 'Instituto',
  taller: 'Taller',
  casa: 'Casa propia',
};

/** Lugar de vida de Rupert según la etapa (coincide con los escenarios del documento de concepto). */
export function lugarDeEtapa(etapa: number): LugarVida {
  if (etapa <= 2) return 'callejon';
  if (etapa <= 4) return 'plaza';
  if (etapa === 5) return 'ciudad';
  if (etapa === 6) return 'pieza';
  if (etapa === 7) return 'instituto';
  if (etapa === 8) return 'taller';
  return 'casa';
}

export const MINIJUEGOS: Minijuego[] = [
  { id: 'basura', nombre: 'Buscar en la basura', descripcion: 'Atrapa lo que sirve y esquiva lo que no.', lugar: 'callejon', desde: 0, hasta: 2, escena: 'Basura' },
  { id: 'reciclaje', nombre: 'Juntar para reciclar', descripcion: 'Separa cada cosa en su tacho.', lugar: 'callejon', desde: 0, hasta: 4, escena: 'Reciclaje' },
  { id: 'collares', nombre: 'Collares de chapitas', descripcion: 'Arma el collar que pide el cliente y véndelo.', lugar: 'callejon', desde: 0, hasta: 3, escena: 'Collares' },
  { id: 'ratones', nombre: 'Carrera de ratones', descripcion: 'Anima a tu ratón al ritmo justo para que gane.', lugar: 'callejon', desde: 0, hasta: 2, escena: 'Ratones' },
  { id: 'platos', nombre: 'Lavar platos en el bar', descripcion: 'Friega rápido antes de que se apilen.', lugar: 'callejon', desde: 1, hasta: 3, escena: 'Platos' },
  { id: 'volantes', nombre: 'Repartir volantes', descripcion: 'Entrega volantes a quien pasa, sin molestar.', lugar: 'plaza', desde: 3, hasta: 4, escena: 'Volantes' },
  { id: 'arreglos', nombre: 'Changas de arreglos', descripcion: 'Repara cosas del barrio con las herramientas justas.', lugar: 'plaza', desde: 3, hasta: 5, escena: 'Arreglos' },
  { id: 'entrevista', nombre: 'Entrevista de trabajo', descripcion: 'Elige bien tus respuestas.', lugar: 'plaza', desde: 4, hasta: 4, escena: 'Entrevista' },
  { id: 'reparto', nombre: 'Reparto en bici', descripcion: 'Salta los obstáculos y entrega los pedidos.', lugar: 'ciudad', desde: 5, hasta: 6, escena: 'Reparto' },
  { id: 'cocina', nombre: 'Cocinar recetas', descripcion: 'Sigue la receta con el hornillo.', lugar: 'pieza', desde: 6, hasta: 9, escena: 'Cocina' },
  { id: 'examenes', nombre: 'Exámenes de ingenio', descripcion: 'Acertijos contra reloj.', lugar: 'instituto', desde: 7, hasta: 9, escena: 'Examenes' },
  { id: 'taller', nombre: 'Reparar el auto', descripcion: 'Encuentra la falla y cámbiala.', lugar: 'taller', desde: 8, hasta: 9, escena: 'TallerAuto' },
];

export type EstadoMinijuego = 'disponible' | 'proximamente' | 'bloqueado' | 'superado';

export function estadoMinijuego(m: Minijuego, etapa: number): EstadoMinijuego {
  if (etapa < m.desde) return 'bloqueado';
  if (etapa > m.hasta) return 'superado';
  return m.escena ? 'disponible' : 'proximamente';
}

/** Minijuegos para mostrar en el panel: los de ahora primero, luego los que vienen. Los superados no se muestran. */
export function catalogo(etapa: number): { m: Minijuego; estado: EstadoMinijuego }[] {
  const orden: Record<EstadoMinijuego, number> = { disponible: 0, proximamente: 1, bloqueado: 2, superado: 3 };
  return MINIJUEGOS.map((m) => ({ m, estado: estadoMinijuego(m, etapa) }))
    .filter((x) => x.estado !== 'superado')
    .sort((a, b) => orden[a.estado] - orden[b.estado] || a.m.desde - b.m.desde);
}

/** Puntos que da cada puesto en la carrera de ratones (no se apuesta nada). */
export const PREMIO_CARRERA = [30, 16, 8, 4];

/**
 * Chapitas para los collares: color y dibujo. Están ordenadas de más fácil a más difícil de distinguir;
 * cada nivel suma la siguiente de la lista.
 */
export const CHAPAS = [
  'roja', 'azul', 'amarilla', 'verde', 'plateada', 'naranja', 'violeta', 'negra',
  'roja_estrella', 'azul_punto', 'dorada_estrella', 'verde_punto', 'rosa', 'celeste', 'blanca_estrella',
] as const;
export type Chapa = (typeof CHAPAS)[number];

/** Cuántas chapitas distintas hay en juego según los collares ya vendidos (de 3 a 10). */
export function opcionesCollar(vendidos: number): number {
  return Math.min(10, 3 + Math.floor(vendidos / 2));
}

/** Pedido de collar: largo creciente con los collares ya vendidos (de 3 a 8 chapitas). */
export function pedidoCollar(vendidos: number, azar: () => number = Math.random): Chapa[] {
  const largo = Math.min(8, 3 + Math.floor(vendidos / 2));
  const colores = opcionesCollar(vendidos);
  return Array.from({ length: largo }, () => CHAPAS[Math.floor(azar() * colores)]);
}

/** Lo que paga un collar terminado: más largo, más valioso. */
export function precioCollar(largo: number): number {
  return largo * 2 + (largo >= 6 ? 4 : 0);
}

export type Tacho = 'plastico' | 'vidrio' | 'papel' | 'metal';

/** A qué tacho va cada objeto en el reciclaje. */
export const RECICLABLES: Record<string, Tacho> = {
  botella_plastico: 'plastico',
  botella_aplastada: 'plastico',
  vaso_yogur: 'plastico',
  bidon: 'plastico',
  bolsa: 'plastico',
  peine: 'plastico',
  secador: 'plastico',
  botella: 'vidrio',
  botella_vino: 'vidrio',
  frasco: 'vidrio',
  vaso: 'vidrio',
  salsa: 'vidrio',
  perfume: 'vidrio',
  caja: 'papel',
  carton: 'papel',
  maple: 'papel',
  revistas: 'papel',
  diario: 'papel',
  volantes: 'papel',
  lata: 'metal',
  conserva: 'metal',
  llave: 'metal',
  tijeras: 'metal',
  rueda: 'metal',
  caja_herramientas: 'metal',
};

/** Ritmo medio de los ratones rivales en cada carrera (px/s del mundo): cada carrera es más difícil. */
export const RIVALES_POR_CARRERA = [20, 24, 27];

/** Impulso del ratón del jugador: alternar patas suma, repetir la misma pata lo frena. */
export function pisada(impulso: number, pata: 'izq' | 'der', anterior: 'izq' | 'der' | null): number {
  if (anterior === pata) return impulso * 0.6;
  return impulso + 3.2;
}
