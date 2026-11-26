/**
 * Escenarios donde vive Rupert según su etapa: fondo, zonas tocables, suelo, objetos del suelo y qué
 * hace "Usar" en cada zona. Coordenadas en el mundo de 480×270. Datos puros, sin Phaser.
 */
import { type LugarVida, lugarDeEtapa } from './minijuegos';

export type Accion =
  | { tipo: 'changa'; id: string; siNo?: string[] }
  | { tipo: 'siesta'; x: number; y: number }
  | { tipo: 'tienda' }
  | { tipo: 'texto'; lineas: string[] };

export interface Zona {
  id: string;
  nombre: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Dónde se para Rupert para usarla. */
  px: number;
  py: number;
  mirar: string[];
  usar: Accion;
}

export interface Recogible {
  id: string;
  imagen: string;
  x: number;
  y: number;
  monedas: number;
  frase: string;
}

export interface Escenario {
  lugar: LugarVida;
  /** Fondo según la etapa (la última clave cuyo número no supera la etapa). */
  fondos: [number, string][];
  primerPlano?: string;
  suelo: { x0: number; x1: number; y0: number; y1: number };
  /** Dónde aparece Rupert al entrar. */
  inicio: { x: number; y: number };
  zonas: Zona[];
  recogibles: Recogible[];
  /** Qué dice si le piden dormir en un lugar sin cama. */
  sinCama?: string;
  /**
   * Tamaño de Rupert en este lugar (1 = 112 px de alto). Los interiores están dibujados más cerca:
   * se calculó con objetos de medida conocida (una mesa mide unos 75 cm, un pupitre unos 75 cm).
   */
  escala?: number;
}

const CALLEJON: Escenario = {
  lugar: 'callejon',
  fondos: [[0, 'callejon_e0'], [1, 'callejon_e1']],
  primerPlano: 'callejon_frente',
  // A la derecha termina antes de la farola del primer plano, para que Rupert no quede tapado.
  suelo: { x0: 22, x1: 410, y0: 196, y1: 262 },
  inicio: { x: 240, y: 232 },
  zonas: [
    { id: 'farola', nombre: 'Farola', x0: 430, y0: 0, x1: 464, y1: 192, px: 404, py: 228,
      mirar: ['La farola parpadea en código Morse. Creo que dice "ánimo".', 'Mi única fuente de luz nocturna. Y de calefacción, si me acerco mucho.'],
      usar: { tipo: 'texto', lineas: ['Si me apoyo, se apaga. Ya lo probé.'] } },
    { id: 'contenedor', nombre: 'Contenedor', x0: 292, y0: 78, x1: 410, y1: 170, px: 345, py: 205,
      mirar: ['El contenedor. Hay gente que lo llama basura; yo lo llamo "posibilidades".', 'Huele a aventura. Y a pescado.'],
      usar: { tipo: 'changa', id: 'basura' } },
    { id: 'puerta', nombre: 'Puerta trasera', x0: 250, y0: 60, x1: 290, y1: 138, px: 270, py: 200,
      mirar: ['La puerta trasera del bar. De ahí sale el mejor olor del barrio.', 'Una vez se abrió y me dieron una medialuna. Fue un gran día.'],
      usar: { tipo: 'changa', id: 'platos', siNo: ['Cerrada. Tal vez cuando esté más presentable me den trabajo.'] } },
    { id: 'tarima', nombre: 'Tarima', x0: 216, y0: 92, x1: 246, y1: 140, px: 232, py: 200,
      mirar: ['Mi taller de bijouterie: una tarima y una lata llena de chapitas.', 'Con chapitas y un hilo hago collares. Los turistas los aman.'],
      usar: { tipo: 'changa', id: 'collares' } },
    { id: 'charco', nombre: 'Charco', x0: 222, y0: 140, x1: 292, y1: 182, px: 258, py: 212,
      mirar: ['Un charco. Refleja mejor que cualquier espejo que haya tenido.', 'Si lo miro mucho rato, me devuelve la mirada.'],
      usar: { tipo: 'texto', lineas: ['¿Lavarme en un charco? Tengo mis estándares... bajos, pero los tengo.'] } },
    { id: 'tuberia', nombre: 'Tubería', x0: 158, y0: 20, x1: 192, y1: 165, px: 182, py: 208,
      mirar: ['Una tubería oxidada. Ahí viven los ratones más veloces del barrio.', 'Si apoyo la oreja, escucho a los ratones entrenando.'],
      usar: { tipo: 'changa', id: 'ratones', siNo: ['Los ratones no quieren correr ahora.'] } },
    { id: 'cama', nombre: 'Cama de cartón', x0: 20, y0: 128, x1: 166, y1: 190, px: 115, py: 214,
      mirar: ['Mi suite presidencial. Cartón doble, vista al contenedor.', 'La manta tiene más agujeros que un queso, pero es mía.'],
      usar: { tipo: 'siesta', x: 92, y: 186 } },
    { id: 'bolsas', nombre: 'Bolsas de reciclaje', x0: 6, y0: 200, x1: 74, y1: 262, px: 84, py: 240,
      mirar: ['Lo que junto para reciclar. Separado, vale más.', 'Latas, botellas, cartón... un tesoro bien ordenado.'],
      usar: { tipo: 'changa', id: 'reciclaje' } },
  ],
  recogibles: [
    { id: 'lata', imagen: 'lata', x: 92, y: 240, monedas: 3, frase: 'Una lata. Al reciclaje, ¡y unas monedas!' },
    { id: 'moneda', imagen: 'moneda', x: 214, y: 252, monedas: 5, frase: '¡Una moneda! El día empieza bien.' },
  ],
};

const PLAZA: Escenario = {
  lugar: 'plaza',
  fondos: [[0, 'plaza']],
  suelo: { x0: 20, x1: 460, y0: 186, y1: 262 },
  inicio: { x: 220, y: 226 },
  zonas: [
    { id: 'banco', nombre: 'Banco de la plaza', x0: 64, y0: 120, x1: 146, y1: 172, px: 105, py: 198,
      mirar: ['Mi nuevo dormitorio. Tiene vista a la fuente y techo de árbol.', 'Un banco de madera. Más cómodo que el cartón, te lo aseguro.'],
      usar: { tipo: 'siesta', x: 105, y: 168 } },
    { id: 'fuente', nombre: 'Fuente', x0: 185, y0: 70, x1: 296, y1: 142, px: 240, py: 196,
      mirar: ['La fuente de la plaza. Dicen que si tirás una moneda se cumple un deseo.', 'El agua suena como aplausos. Me gusta pensar que son para mí.'],
      usar: { tipo: 'texto', lineas: ['Me mojo la cara... ¡qué fresca! Pero para bañarse mejor la ducha.'] } },
    { id: 'kiosco', nombre: 'Kiosco', x0: 364, y0: 38, x1: 474, y1: 166, px: 380, py: 200,
      mirar: ['El kiosco de Don Tito. Diarios, revistas y caramelos.', 'Don Tito me fía un café de vez en cuando.'],
      usar: { tipo: 'tienda' } },
    { id: 'palomas', nombre: 'Palomas', x0: 196, y0: 143, x1: 346, y1: 168, px: 270, py: 200,
      mirar: ['Las palomas de la plaza. Me conocen todas.', 'Esa gris es la jefa. No le caigo bien.'],
      usar: { tipo: 'texto', lineas: ['¡Shhh! Se fueron volando. Siempre vuelven.'] } },
    { id: 'arbol', nombre: 'Árbol', x0: 0, y0: 0, x1: 80, y1: 150, px: 60, py: 200,
      mirar: ['Un árbol enorme. Da la mejor sombra del barrio.', 'Alguien grabó un corazón en la corteza. Qué romántico.'],
      usar: { tipo: 'changa', id: 'reciclaje', siNo: ['Me apoyo un rato en el árbol. Qué paz.'] } },
  ],
  recogibles: [
    { id: 'diario', imagen: 'diario', x: 150, y: 246, monedas: 2, frase: 'Un diario de hoy. Lo leo y lo llevo a reciclar.' },
    { id: 'moneda', imagen: 'moneda', x: 330, y: 240, monedas: 5, frase: '¡Una moneda junto a la fuente! Alguien no acertó.' },
  ],
};

const CIUDAD: Escenario = {
  lugar: 'ciudad',
  fondos: [[0, 'ciudad']],
  suelo: { x0: 20, x1: 460, y0: 200, y1: 262 },
  inicio: { x: 220, y: 232 },
  sinCama: 'Duermo en una pensión. Ahora, ¡a trabajar!',
  zonas: [
    { id: 'bici', nombre: 'Bicicleta de reparto', x0: 380, y0: 118, x1: 468, y1: 168, px: 410, py: 210,
      mirar: ['Mi bici de reparto. Le puse nombre: Rayo.', 'Tiene más kilómetros que yo, pero anda.'],
      usar: { tipo: 'changa', id: 'reparto' } },
    { id: 'panaderia', nombre: 'Panadería', x0: 218, y0: 25, x1: 320, y1: 150, px: 270, py: 205,
      mirar: ['La panadería. El olor me acompaña todo el día.', 'Ahora puedo comprar pan. ¡Pan entero!'],
      usar: { tipo: 'tienda' } },
    { id: 'jugueteria', nombre: 'Juguetería', x0: 5, y0: 25, x1: 105, y1: 150, px: 60, py: 205,
      mirar: ['Una juguetería. Ese osito se parece al que encontré en la basura.'],
      usar: { tipo: 'texto', lineas: ['Solo miro. Algún día le compro algo a un sobrino.'] } },
    { id: 'floreria', nombre: 'Florería', x0: 108, y0: 25, x1: 218, y1: 150, px: 165, py: 205,
      mirar: ['La florería. Huele a primavera todo el año.'],
      usar: { tipo: 'texto', lineas: ['Una flor para la ventana... cuando tenga ventana.'] } },
    { id: 'libreria', nombre: 'Librería', x0: 320, y0: 25, x1: 402, y1: 150, px: 360, py: 205,
      mirar: ['La librería. Me gustaría volver a estudiar.'],
      usar: { tipo: 'texto', lineas: ['El librero me presta un libro si lo devuelvo sin manchas.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 130, y: 246, monedas: 6, frase: '¡Propina del último pedido!' },
    { id: 'lata', imagen: 'lata', x: 300, y: 254, monedas: 3, frase: 'Una lata en la vereda. Al reciclaje.' },
  ],
};

const PIEZA: Escenario = {
  lugar: 'pieza',
  fondos: [[0, 'pieza']],
  escala: 1.6,
  suelo: { x0: 40, x1: 440, y0: 214, y1: 264 },
  inicio: { x: 250, y: 244 },
  zonas: [
    { id: 'cama', nombre: 'Cama', x0: 2, y0: 75, x1: 200, y1: 180, px: 210, py: 230,
      mirar: ['¡Una cama de verdad! Con colchón y todo.', 'La almohada es tan blanda que me dan ganas de llorar.'],
      usar: { tipo: 'siesta', x: 100, y: 176 } },
    { id: 'hornillo', nombre: 'Hornillo', x0: 335, y0: 70, x1: 458, y1: 180, px: 380, py: 232,
      mirar: ['Un hornillo y una mesa. Mi cocina-comedor-escritorio.', 'Ya sé hacer arroz. Y arroz con algo.'],
      usar: { tipo: 'changa', id: 'cocina', siNo: ['Pronto voy a cocinar mis propias recetas.'] } },
    { id: 'ventana', nombre: 'Ventana', x0: 192, y0: 0, x1: 330, y1: 100, px: 260, py: 222,
      mirar: ['Mi ventana con plantas. Las riego todos los días.', 'Desde aquí se ve la plaza donde dormía.'],
      usar: { tipo: 'texto', lineas: ['Riego las plantas. Crecen igual que yo: de a poco.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 150, y: 256, monedas: 6, frase: 'Una moneda bajo la cama. ¡Ahorros olvidados!' },
    { id: 'libro', imagen: 'libro', x: 320, y: 254, monedas: 3, frase: 'Un libro viejo. Lo vendo en la librería.' },
  ],
};

const INSTITUTO: Escenario = {
  lugar: 'instituto',
  fondos: [[0, 'instituto']],
  escala: 1.35,
  suelo: { x0: 36, x1: 444, y0: 206, y1: 264 },
  inicio: { x: 250, y: 240 },
  sinCama: 'Dormir en clase no está bien visto. Mejor me quedo despierto.',
  zonas: [
    { id: 'pizarron', nombre: 'Pizarrón', x0: 170, y0: 17, x1: 410, y1: 105, px: 290, py: 222,
      mirar: ['El pizarrón. La profe dibuja montañas para explicar geografía.', 'Un árbol, una montaña, un triángulo... ¿examen sorpresa?'],
      usar: { tipo: 'changa', id: 'examenes', siNo: ['Pronto voy a rendir los exámenes de ingenio.'] } },
    { id: 'biblioteca', nombre: 'Biblioteca', x0: 95, y0: 30, x1: 162, y1: 160, px: 130, py: 222,
      mirar: ['La biblioteca del aula. Ya leí la mitad.'],
      usar: { tipo: 'texto', lineas: ['Saco un libro de historia. Este capítulo es de piratas, ¡qué bueno!'] } },
    { id: 'globo', nombre: 'Globo terráqueo', x0: 425, y0: 40, x1: 465, y1: 98, px: 420, py: 222,
      mirar: ['El globo terráqueo. Algún día voy a viajar.'],
      usar: { tipo: 'texto', lineas: ['Lo hago girar y apunto con el dedo... ¡Islandia! Algún día.'] } },
    { id: 'pupitre', nombre: 'Pupitres', x0: 140, y0: 106, x1: 425, y1: 176, px: 250, py: 226,
      mirar: ['Mi pupitre. Tiene grabado "Rupert estuvo aquí".'],
      usar: { tipo: 'texto', lineas: ['Me siento a repasar. Tres más tres... seis. ¡Bien!'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 90, y: 252, monedas: 6, frase: '¡Una moneda! La guardo para el café del recreo.' },
    { id: 'libro', imagen: 'libro', x: 380, y: 254, monedas: 3, frase: 'Un libro que alguien olvidó. Lo devuelvo a la biblioteca.' },
  ],
};

const TALLER: Escenario = {
  lugar: 'taller',
  fondos: [[0, 'taller']],
  suelo: { x0: 20, x1: 460, y0: 196, y1: 262 },
  inicio: { x: 200, y: 232 },
  sinCama: 'Duermo en mi pieza. Aquí vengo a trabajar con el auto.',
  zonas: [
    { id: 'auto', nombre: 'Auto', x0: 242, y0: 105, x1: 380, y1: 172, px: 300, py: 208,
      mirar: ['¡Mi auto! Usado, celeste y con carácter.', 'Hace un ruido raro al frenar. Le digo que es su forma de saludar.'],
      usar: { tipo: 'changa', id: 'taller', siNo: ['Pronto voy a aprender a arreglarlo yo mismo.'] } },
    { id: 'puerta1', nombre: 'Casa de los vecinos', x0: 97, y0: 60, x1: 132, y1: 130, px: 115, py: 200,
      mirar: ['La casa de los Gómez. Me saludan cada mañana.'],
      usar: { tipo: 'texto', lineas: ['Toco el timbre... la señora Gómez me regala una torta. ¡Qué amable!'] } },
    { id: 'puerta2', nombre: 'Casa verde', x0: 375, y0: 60, x1: 408, y1: 130, px: 392, py: 200,
      mirar: ['La casa de la puerta verde. Dicen que se vende...'],
      usar: { tipo: 'texto', lineas: ['Me imagino viviendo aquí. Un poquito más y lo logramos.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 150, y: 248, monedas: 6, frase: 'Una moneda en el cordón. ¡A la alcancía!' },
    { id: 'llave', imagen: 'llave', x: 420, y: 244, monedas: 4, frase: 'Una llave inglesa olvidada. ¡Justo la que necesitaba!' },
  ],
};

const CASA: Escenario = {
  lugar: 'casa',
  fondos: [[0, 'casa']],
  suelo: { x0: 20, x1: 460, y0: 196, y1: 262 },
  inicio: { x: 250, y: 232 },
  zonas: [
    { id: 'puerta', nombre: 'Puerta de casa', x0: 222, y0: 50, x1: 268, y1: 140, px: 245, py: 200,
      mirar: ['La puerta de MI casa. Todavía me cuesta creerlo.', 'Tiene mi nombre en el buzón. Rupert. Con mayúscula.'],
      usar: { tipo: 'siesta', x: 245, y: 210 } },
    { id: 'buzon', nombre: 'Buzón', x0: 358, y0: 112, x1: 388, y1: 148, px: 372, py: 200,
      mirar: ['Mi buzón rojo. Llegan cartas, ¡y no son cuentas!'],
      usar: { tipo: 'texto', lineas: ['Una carta... "Gracias por inspirarnos". Firmado: el barrio.'] } },
    { id: 'jardin', nombre: 'Jardín', x0: 400, y0: 100, x1: 478, y1: 152, px: 420, py: 205,
      mirar: ['Mi jardín. Planté flores de todos los colores.'],
      usar: { tipo: 'changa', id: 'decorar', siNo: ['Riego las flores. Pronto voy a decorar toda la casa.'] } },
    { id: 'arbol', nombre: 'Árbol', x0: 0, y0: 0, x1: 120, y1: 150, px: 90, py: 205,
      mirar: ['Un árbol propio. Le voy a colgar una hamaca.'],
      usar: { tipo: 'texto', lineas: ['Me siento a la sombra. Cuántas cosas pasaron desde el callejón...'] } },
  ],
  recogibles: [
    { id: 'flor', imagen: 'flor', x: 140, y: 246, monedas: 2, frase: 'Una flor del jardín. La pongo en un vaso.' },
    { id: 'moneda', imagen: 'moneda', x: 330, y: 250, monedas: 8, frase: '¡Una moneda! Para la alcancía de la casa.' },
  ],
};

export const ESCENARIOS: Record<LugarVida, Escenario> = {
  callejon: CALLEJON,
  plaza: PLAZA,
  ciudad: CIUDAD,
  pieza: PIEZA,
  instituto: INSTITUTO,
  taller: TALLER,
  casa: CASA,
};

export function escenarioDeEtapa(etapa: number): Escenario {
  return ESCENARIOS[lugarDeEtapa(etapa)];
}

/** Fondo del lugar donde vive Rupert en esa etapa. */
export function fondoDeEtapa(etapa: number): string {
  const esc = escenarioDeEtapa(etapa);
  let clave = esc.fondos[0][1];
  for (const [desde, k] of esc.fondos) if (etapa >= desde) clave = k;
  return clave;
}

/** Todas las imágenes de fondo usadas por los escenarios (para precargarlas). */
export const FONDOS = [...new Set(Object.values(ESCENARIOS).flatMap((e) => e.fondos.map(([, k]) => k)))];
