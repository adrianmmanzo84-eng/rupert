/**
 * Escenarios donde vive Rupert según su etapa: fondo, zonas tocables, suelo, objetos del suelo y qué
 * hace "Usar" en cada zona. Coordenadas en el mundo de 480×270. Datos puros, sin Phaser.
 */
import type { Hueco } from './decoracion';
import { type LugarVida, lugarDeEtapa } from './minijuegos';

export type Accion =
  | { tipo: 'changa'; id: string; siNo?: string[] }
  | { tipo: 'siesta'; x: number; y: number }
  | { tipo: 'tienda' }
  /** Pasa a otro escenario del mismo lugar (por ejemplo, del interior de la casa al jardín). */
  | { tipo: 'ir'; a: string }
  | { tipo: 'texto'; lineas: string[] }
  /** Bañarse en la ducha pública con jabón, shampoo o toalla (R029). */
  | { tipo: 'ducha' };

/**
 * Dibujos de las duchas públicas (R030): tamaño del dibujo original y su abertura (por donde entra Rupert),
 * en px de ese dibujo. Los tamaños sirven para escalar la abertura al alto con que se muestra cada ducha.
 */
export const DIBUJOS_DUCHA = {
  /** Cabina cerrada del callejón: la puerta corrediza se abre sobre el panel de la puerta. */
  callejon: { ancho: 642, alto: 1168, abertura: { x0: 186, y0: 112, x1: 530, y1: 1119 } },
  /** Cabina de la plaza, con la puerta abierta y cerrada (mismo recuadro). */
  plaza: { ancho: 725, alto: 1173, abertura: { x0: 205, y0: 129, x1: 515, y1: 1109 } },
} as const;

/** Una puerta pintada en el fondo (por ejemplo, la del baño de la florería), en px del mundo. */
export interface PuertaBano {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Ducha pública en un escenario de la calle (R030). Puede ser una cabina dibujada (`dibujo`, `imagen`, y
 * `abierta` si hay un dibujo con la puerta abierta) o una puerta pintada en el fondo (`puerta`).
 * Para las cabinas, `x` es el centro y `y` la base; `alto` es cuánto miden en el mundo (lejos se ven más chicas).
 */
export interface Ducha {
  x: number;
  y: number;
  alto: number;
  /** Dónde se para Rupert antes de entrar. */
  px: number;
  py: number;
  dibujo?: keyof typeof DIBUJOS_DUCHA;
  /** Textura de la cabina cerrada. */
  imagen?: string;
  /** Textura de la cabina con la puerta abierta; sin ella, la puerta se desliza sobre la cabina cerrada. */
  abierta?: string;
  /** Puerta del fondo que hace de baño (no se dibuja nada encima, solo se abre y se cierra). */
  puerta?: PuertaBano;
  /** Etapas en las que está (por defecto, todas las del escenario). */
  desde?: number;
  hasta?: number;
}

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
  /** Identificador único (el lugar de vida, o un escenario extra como el jardín). */
  id: string;
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
  /** Duchas públicas de la calle (R029). */
  duchas?: Ducha[];
  /**
   * Tamaño de Rupert en este lugar (1 = 112 px de alto). Los interiores están dibujados más cerca:
   * se calculó con objetos de medida conocida (una mesa mide unos 75 cm, un pupitre unos 75 cm).
   */
  escala?: number;
  /** Lo escrito con tiza sobre un pizarrón: textos y trazos (listas de puntos x, y). */
  tiza?: { textos: { x: number; y: number; s: string; tam: number }[]; trazos: number[][] };
  /** Huecos donde se pueden poner objetos comprados (solo en la casa propia). */
  huecos?: Hueco[];
}

const CALLEJON: Escenario = {
  id: 'callejon',
  lugar: 'callejon',
  fondos: [[0, 'callejon_e0'], [1, 'callejon_e1']],
  primerPlano: 'callejon_frente',
  // A la derecha termina antes de la farola del primer plano, para que Rupert no quede tapado.
  suelo: { x0: 22, x1: 410, y0: 196, y1: 262 },
  inicio: { x: 240, y: 232 },
  // Etapa 0: cabina al fondo del callejón, junto a la tubería. Etapas 1 y 2: la misma, más grande y tapando la pintada.
  duchas: [
    { x: 207, y: 146, alto: 58, px: 214, py: 200, dibujo: 'callejon', imagen: 'ducha_callejon_0', desde: 0, hasta: 0 },
    { x: 226, y: 149, alto: 88, px: 228, py: 200, dibujo: 'callejon', imagen: 'ducha_callejon_1', desde: 1 },
  ],
  zonas: [
    { id: 'farola', nombre: 'Farola', x0: 430, y0: 0, x1: 464, y1: 192, px: 404, py: 228,
      mirar: ['La farola parpadea en código Morse. Creo que dice “ánimo”. O “auxilio”. Mi Morse es de nivel básico.', 'Mi única fuente de luz nocturna. Y de calefacción, si me arrimo bien cerca. Las cejas vuelven a crecer.'],
      usar: { tipo: 'texto', lineas: ['Si me apoyo, se apaga. Ya lo probé. Dos veces. La segunda, por si la primera había sido casualidad.'] } },
    { id: 'contenedor', nombre: 'Contenedor', x0: 292, y0: 78, x1: 410, y1: 170, px: 345, py: 205,
      mirar: ['El contenedor. Hay gente que lo llama basura; yo prefiero “oportunidades de negocio”. Huelen igual.', 'Huele a aventura. También a pescado. Sobre todo a pescado.'],
      usar: { tipo: 'changa', id: 'basura' } },
    { id: 'puerta', nombre: 'Puerta trasera', x0: 250, y0: 60, x1: 290, y1: 138, px: 270, py: 200,
      mirar: ['La puerta trasera del bar. De ahí sale el mejor olor del barrio. Y ninguna invitación.', 'Una vez se abrió y me dieron una medialuna. Fue el mejor día de mi vida. Sí, ya sé que es triste. No hace falta que lo digas.'],
      usar: { tipo: 'changa', id: 'platos', siNo: ['Cerrada. Tal vez cuando esté más presentable me den trabajo. O sea, nunca.'] } },
    { id: 'tarima', nombre: 'Tarima', x0: 216, y0: 92, x1: 246, y1: 140, px: 232, py: 200,
      mirar: ['Mi taller de bijouterie: una tarima y una lata llena de chapitas. París tiembla.', 'Con chapitas y un hilo hago collares. Los turistas los adoran, según los dos turistas que tuve.'],
      usar: { tipo: 'changa', id: 'collares' } },
    { id: 'charco', nombre: 'Charco', x0: 222, y0: 140, x1: 292, y1: 182, px: 258, py: 212,
      mirar: ['Un charco. Refleja mejor que cualquier espejo que haya tenido. Es el único espejo que tuve.', 'Si lo miro mucho rato, me devuelve la mirada. Y no parece impresionado.'],
      usar: { tipo: 'texto', lineas: ['¿Lavarme en un charco? Tengo mis estándares... bajos, pero los tengo. Y el charco ni siquiera llega.'] } },
    { id: 'tuberia', nombre: 'Tubería', x0: 158, y0: 20, x1: 192, y1: 165, px: 182, py: 208,
      mirar: ['Una tubería oxidada. Ahí viven los ratones más veloces del barrio. Y los únicos que me prestan atención.', 'Si apoyo la oreja, escucho a los ratones entrenando. Tienen mejor rutina que yo.'],
      usar: { tipo: 'changa', id: 'ratones', siNo: ['Los ratones no quieren correr ahora. Están en huelga: piden aumento de queso.'] } },
    { id: 'cama', nombre: 'Cama de cartón', x0: 20, y0: 128, x1: 166, y1: 190, px: 115, py: 214,
      mirar: ['Mi suite presidencial. Cartón doble, vista al contenedor. Cinco estrellas... las del cielo, porque techo no hay.', 'La manta tiene más agujeros que un queso. Eso sí: ventilación natural.'],
      usar: { tipo: 'siesta', x: 92, y: 186 } },
    { id: 'bolsas', nombre: 'Bolsas de reciclaje', x0: 6, y0: 200, x1: 74, y1: 262, px: 84, py: 240,
      mirar: ['Lo que junto para reciclar. Separado, vale más. Es mi único talento comprobado.', 'Latas, botellas, cartón... un tesoro bien ordenado. Algún día voy a ser rico. Algún día.'],
      usar: { tipo: 'changa', id: 'reciclaje' } },
  ],
  recogibles: [
    { id: 'lata', imagen: 'lata', x: 92, y: 240, monedas: 3, frase: 'Una lata. Al reciclaje. Así empiezan todos los imperios.' },
    { id: 'moneda', imagen: 'moneda', x: 214, y: 252, monedas: 5, frase: '¡Una moneda! Alguien perdió plata y yo gané. Qué bien funciona la economía.' },
  ],
};

const PLAZA: Escenario = {
  id: 'plaza',
  lugar: 'plaza',
  fondos: [[0, 'plaza']],
  suelo: { x0: 20, x1: 460, y0: 186, y1: 262 },
  inicio: { x: 220, y: 226 },
  // A la derecha de la fuente, delante de los arbustos, donde la marcó el autor sobre una captura (R031).
  // Las palomas del fondo quedan delante, más abajo, sin taparse.
  duchas: [{ x: 325.7, y: 136.5, alto: 67, px: 325, py: 190, dibujo: 'plaza', imagen: 'ducha_plaza', abierta: 'ducha_plaza_abierta' }],
  zonas: [
    { id: 'banco', nombre: 'Banco de la plaza', x0: 64, y0: 120, x1: 146, y1: 172, px: 105, py: 198,
      mirar: ['Mi nuevo dormitorio. Vista a la fuente, techo de árbol y servicio de palomas incluido.', 'Un banco de madera. Más cómodo que el cartón, aunque las tablas tienen opiniones sobre mi columna.'],
      usar: { tipo: 'siesta', x: 105, y: 168 } },
    { id: 'fuente', nombre: 'Fuente', x0: 185, y0: 70, x1: 296, y1: 142, px: 240, py: 196,
      mirar: ['La fuente de la plaza. Dicen que si tirás una moneda se cumple un deseo. Yo deseo monedas, así que no la voy a tirar.', 'El agua suena como aplausos. Me gusta pensar que son para mí. Es lo más cerca que estuve de un aplauso.'],
      usar: { tipo: 'texto', lineas: ['Me mojo la cara... ¡qué fresca! Para bañarme en serio está la ducha. Acá la policía tiene opiniones.'] } },
    { id: 'kiosco', nombre: 'Kiosco', x0: 364, y0: 38, x1: 474, y1: 166, px: 380, py: 200,
      mirar: ['El kiosco de Don Tito. Diarios, revistas y caramelos. Y un cliente que no compra nada: yo.', 'Don Tito me fía un café de vez en cuando. Mi deuda ya es monumento histórico.'],
      usar: { tipo: 'tienda' } },
    { id: 'palomas', nombre: 'Palomas', x0: 196, y0: 143, x1: 346, y1: 168, px: 270, py: 200,
      mirar: ['Las palomas de la plaza. Me conocen todas. Por el olor, creo.', 'Esa gris es la jefa. No le caigo bien. Me mira como el banco cuando pido un préstamo.'],
      usar: { tipo: 'texto', lineas: ['¡Shhh! Se fueron volando. Siempre vuelven, igual que mis problemas.'] } },
    { id: 'arbol', nombre: 'Árbol', x0: 0, y0: 0, x1: 80, y1: 150, px: 60, py: 200,
      mirar: ['Un árbol enorme. Da la mejor sombra del barrio. Cobra en ramitas que me caen en la cabeza.', 'Alguien grabó un corazón en la corteza. Qué romántico. Qué poco respeto por el árbol.'],
      usar: { tipo: 'changa', id: 'reciclaje', siNo: ['Me apoyo un rato en el árbol. Qué paz. Por unos segundos, no me siento un fracaso.'] } },
  ],
  recogibles: [
    { id: 'diario', imagen: 'diario', x: 150, y: 246, monedas: 2, frase: 'Un diario de hoy. Lo leo y lo llevo a reciclar. Hoy tampoco hay buenas noticias, pero tiene crucigrama.' },
    { id: 'moneda', imagen: 'moneda', x: 330, y: 240, monedas: 5, frase: '¡Una moneda junto a la fuente! Alguien tenía mala puntería y yo, buena suerte.' },
  ],
};

const CIUDAD: Escenario = {
  id: 'ciudad',
  lugar: 'ciudad',
  fondos: [[0, 'ciudad']],
  suelo: { x0: 20, x1: 460, y0: 200, y1: 262 },
  inicio: { x: 220, y: 232 },
  sinCama: 'Duermo en una pensión, con baño compartido y vista a otra pensión. Ahora, ¡a trabajar!',
  // La puerta con el cartel «Baño» de la florería, pintada en el fondo.
  duchas: [{ x: 199, y: 149, alto: 74, px: 199, py: 212, puerta: { x0: 187, y0: 75, x1: 212, y1: 149 } }],
  zonas: [
    { id: 'bici', nombre: 'Bicicleta de reparto', x0: 380, y0: 118, x1: 468, y1: 168, px: 410, py: 210,
      mirar: ['Mi bici de reparto. Le puse Rayo. Es una cuestión de fe.', 'Tiene más kilómetros que yo, pero anda. Casi siempre. Cuando quiere.'],
      usar: { tipo: 'changa', id: 'reparto' } },
    { id: 'panaderia', nombre: 'Panadería', x0: 218, y0: 25, x1: 320, y1: 150, px: 270, py: 205,
      mirar: ['La panadería. El olor me acompaña todo el día. Y la mirada del panadero, también.', 'Ahora puedo comprar pan. ¡Pan entero! Con corteza y todo. Me asusta tanta prosperidad.'],
      usar: { tipo: 'tienda' } },
    { id: 'jugueteria', nombre: 'Juguetería', x0: 5, y0: 25, x1: 105, y1: 150, px: 60, py: 205,
      mirar: ['Una juguetería. Ese osito se parece al que encontré en la basura. Si es el mismo, subió de categoría.'],
      usar: { tipo: 'texto', lineas: ['Solo miro. Algún día le compro algo a un sobrino. Cuando tenga un sobrino. Y plata.'] } },
    { id: 'floreria', nombre: 'Florería', x0: 108, y0: 25, x1: 218, y1: 150, px: 165, py: 205,
      mirar: ['La florería. Huele a primavera todo el año. Yo huelo a otoño. A otoño mojado.'],
      usar: { tipo: 'texto', lineas: ['Una flor para la ventana... cuando tenga ventana. Y maceta. Y paciencia para que no se me muera.'] } },
    { id: 'libreria', nombre: 'Librería', x0: 320, y0: 25, x1: 402, y1: 150, px: 360, py: 205,
      mirar: ['La librería. Me gustaría volver a estudiar. O al menos leer sin que me echen.'],
      usar: { tipo: 'texto', lineas: ['El librero me presta un libro si lo devuelvo sin manchas. Me mira las manos antes de prestármelo. Con razón.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 130, y: 246, monedas: 6, frase: '¡Propina del último pedido! Un desconocido me regaló plata. Todavía no sé si es una trampa.' },
    { id: 'lata', imagen: 'lata', x: 300, y: 254, monedas: 3, frase: 'Una lata en la vereda. Al reciclaje, por los viejos tiempos. Y por unas monedas.' },
  ],
};

const PIEZA: Escenario = {
  id: 'pieza',
  lugar: 'pieza',
  fondos: [[0, 'pieza']],
  escala: 1.6,
  suelo: { x0: 40, x1: 440, y0: 214, y1: 264 },
  inicio: { x: 250, y: 244 },
  zonas: [
    { id: 'cama', nombre: 'Cama', x0: 2, y0: 75, x1: 200, y1: 180, px: 210, py: 230,
      mirar: ['¡Una cama de verdad! Con colchón y todo. Nadie me lo cree, pero tiene hasta sábana.', 'La almohada es tan blanda que me dan ganas de llorar. Y lloro un poquito. En privado, claro.'],
      usar: { tipo: 'siesta', x: 100, y: 176 } },
    { id: 'hornillo', nombre: 'Hornillo', x0: 335, y0: 70, x1: 458, y1: 180, px: 380, py: 232,
      mirar: ['Un hornillo y una mesa. Mi cocina-comedor-escritorio-vestidor. Un monoambiente muy ambicioso.', 'Ya sé hacer arroz. Y arroz con algo. A veces el algo es más arroz.'],
      usar: { tipo: 'changa', id: 'cocina', siNo: ['Pronto voy a cocinar mis propias recetas. Con suerte, comestibles.'] } },
    { id: 'ventana', nombre: 'Ventana', x0: 192, y0: 0, x1: 330, y1: 100, px: 260, py: 222,
      mirar: ['Mi ventana con plantas. Las riego todos los días. Son la única familia que no se queja.', 'Desde aquí se ve la plaza donde dormía. De lejos tenía su encanto. Muy de lejos.'],
      usar: { tipo: 'texto', lineas: ['Riego las plantas. Crecen igual que yo: de a poco y con mucha ayuda ajena.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 150, y: 256, monedas: 6, frase: 'Una moneda bajo la cama. ¡Ahorros olvidados! Soy mi propio banco, y el peor administrador.' },
    { id: 'libro', imagen: 'libro', x: 320, y: 254, monedas: 3, frase: 'Un libro viejo. Lo vendo en la librería. Mi primera operación bursátil.' },
  ],
};

const INSTITUTO: Escenario = {
  id: 'instituto',
  lugar: 'instituto',
  fondos: [[0, 'instituto']],
  escala: 1.35,
  // Pizarrón (x 181–400, y 21–95; lo de arriba de y = 38 queda bajo la barra del juego):
  // álgebra, su gráfico y una cuenta de ahorro.
  tiza: {
    textos: [
      { x: 188, y: 40, s: 'x² - 5x + 6 = 0', tam: 12 },
      { x: 188, y: 55, s: '(x - 2)(x - 3) = 0', tam: 10 },
      { x: 188, y: 69, s: 'x = 2   ó   x = 3', tam: 12 },
      { x: 285, y: 40, s: 'y', tam: 8 },
      { x: 334, y: 82, s: 'x', tam: 8 },
      { x: 346, y: 40, s: 'Ahorro', tam: 9 },
      { x: 346, y: 50, s: '  1200', tam: 10 },
      { x: 346, y: 60, s: '-  950', tam: 10 },
      { x: 346, y: 73, s: '   250', tam: 10 },
    ],
    trazos: [
      // Ejes del gráfico.
      [290, 88, 336, 88],
      [292, 42, 292, 92],
      // Parábola y = (x-2)(x-3): corta el eje en 2 y 3.
      [296, 46, 300, 59, 304, 70, 308, 79, 312, 85, 316, 88, 320, 85, 324, 79, 328, 70, 332, 59],
      // Raya de la resta.
      [346, 71, 379, 71],
    ],
  },
  suelo: { x0: 36, x1: 444, y0: 206, y1: 264 },
  inicio: { x: 250, y: 240 },
  sinCama: 'Dormir en clase no está bien visto. Me lo explicaron con un borrador, volando.',
  zonas: [
    { id: 'pizarron', nombre: 'Pizarrón', x0: 170, y0: 17, x1: 410, y1: 105, px: 290, py: 222,
      mirar: ['El pizarrón. La profe dibuja montañas para explicar geografía. Dibuja mejor que yo, que vivía en un callejón.', 'Un árbol, una montaña, un triángulo... ¿examen sorpresa? Voy a fingir que me siento mal.'],
      usar: { tipo: 'changa', id: 'examenes', siNo: ['Pronto voy a rendir los exámenes de ingenio. Ingenio tengo. Lo que me falta es suerte, plata y títulos.'] } },
    { id: 'biblioteca', nombre: 'Biblioteca', x0: 95, y0: 30, x1: 162, y1: 160, px: 130, py: 222,
      mirar: ['La biblioteca del aula. Ya leí la mitad. La mitad con dibujos.'],
      usar: { tipo: 'texto', lineas: ['Saco un libro de historia. Este capítulo es de piratas. Me siento identificado: ropa rota, mal olor y ningún tesoro.'] } },
    { id: 'globo', nombre: 'Globo terráqueo', x0: 425, y0: 40, x1: 465, y1: 98, px: 420, py: 222,
      mirar: ['El globo terráqueo. Algún día voy a viajar. Cerca. Muy cerca. A la otra cuadra.'],
      usar: { tipo: 'texto', lineas: ['Lo hago girar y apunto con el dedo... ¡Islandia! Hace frío, y ya tengo la bufanda.'] } },
    { id: 'pupitre', nombre: 'Pupitres', x0: 140, y0: 106, x1: 425, y1: 176, px: 250, py: 226,
      mirar: ['Mi pupitre. Tiene grabado “Rupert estuvo aquí”. Lo grabé yo, a escondidas. Mi obra maestra.'],
      usar: { tipo: 'texto', lineas: ['Me siento a repasar. Tres más tres... seis. ¡Bien! Si sigo así, me recibo de ingeniero el martes.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 90, y: 252, monedas: 6, frase: '¡Una moneda! La guardo para el café del recreo. Y si alcanza, también para el recreo.' },
    { id: 'libro', imagen: 'libro', x: 380, y: 254, monedas: 3, frase: 'Un libro que alguien olvidó. Lo devuelvo a la biblioteca. Soy un santo con mala suerte.' },
  ],
};

const TALLER: Escenario = {
  id: 'taller',
  lugar: 'taller',
  fondos: [[0, 'taller']],
  suelo: { x0: 20, x1: 460, y0: 196, y1: 262 },
  inicio: { x: 200, y: 232 },
  sinCama: 'Duermo en mi pieza. Acá vengo a trabajar con el auto. Y a rezar para que arranque.',
  zonas: [
    { id: 'auto', nombre: 'Auto', x0: 242, y0: 105, x1: 380, y1: 172, px: 300, py: 208,
      mirar: ['¡Mi auto! Usado, celeste y con carácter. “Carácter” es una forma elegante de decir “defectos”.', 'Hace un ruido raro al frenar. Le digo que es su forma de saludar. Y él me contesta con humo.'],
      usar: { tipo: 'changa', id: 'taller', siNo: ['Pronto voy a aprender a arreglarlo yo mismo. Por ahora lo miro con respeto y le doy palmaditas.'] } },
    { id: 'puerta1', nombre: 'Casa de los vecinos', x0: 97, y0: 60, x1: 132, y1: 130, px: 115, py: 200,
      mirar: ['La casa de los Gómez. Me saludan cada mañana. Desde adentro, con la persiana a medias, pero me saludan.'],
      usar: { tipo: 'texto', lineas: ['Toco el timbre... la señora Gómez me regala una torta. ¡Qué amable! Está fresca. Día de milagros.'] } },
    { id: 'puerta2', nombre: 'Casa verde', x0: 375, y0: 60, x1: 408, y1: 130, px: 392, py: 200,
      mirar: ['La casa de la puerta verde. Dicen que se vende... igual que yo, pero a mí nadie me quiere comprar.'],
      usar: { tipo: 'texto', lineas: ['Me imagino viviendo aquí. Falta poco. Bueno, falta mucho. Pero desde acá se ve cerca.'] } },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 150, y: 248, monedas: 6, frase: 'Una moneda en el cordón. ¡A la alcancía! La pobre se aburría sola.' },
    { id: 'llave', imagen: 'llave', x: 420, y: 244, monedas: 4, frase: 'Una llave inglesa olvidada. ¡Justo la que necesitaba! Hoy el universo me guiñó un ojo. O tenía algo en el ojo.' },
  ],
};

/** Interior de la casa propia (etapa 9): se decora comprando objetos con monedas. */
const CASA: Escenario = {
  id: 'casa',
  lugar: 'casa',
  fondos: [[0, 'casa_interior']],
  // La mesa mide unos 60 px de alto (75 cm reales): Rupert a ×1,3.
  escala: 1.3,
  suelo: { x0: 30, x1: 440, y0: 214, y1: 264 },
  inicio: { x: 320, y: 238 },
  zonas: [
    { id: 'salida', nombre: 'Salir al jardín', x0: 446, y0: 20, x1: 480, y1: 200, px: 430, py: 232,
      mirar: ['Por aquí se sale al jardín. Yo, que dormía junto a un contenedor, tengo jardín. Tomen nota.'],
      usar: { tipo: 'ir', a: 'jardin' } },
    { id: 'ventana', nombre: 'Ventana', x0: 20, y0: 28, x1: 108, y1: 95, px: 70, py: 226,
      mirar: ['Mi ventana con cortinas. Ver el atardecer desde casa no tiene precio. Bueno, sí: una hipoteca de treinta años.', 'Desde aquí se ve el jardín y el buzón rojo. Los dos son míos. ¡Propiedades! Tengo propiedades.'],
      usar: { tipo: 'texto', lineas: ['Abro la ventana. Entra olor a flores. Esto es vida. Y nadie me tira nada desde arriba.'] } },
    { id: 'alacena', nombre: 'Alacena', x0: 288, y0: 22, x1: 404, y1: 80, px: 345, py: 226,
      mirar: ['La alacena. Ya no está vacía: arroz, fideos y galletitas. Las telarañas tuvieron que mudarse.'],
      usar: { tipo: 'tienda' } },
  ],
  huecos: [
    { id: 'estante1', nombre: 'Estante de arriba', tipo: 'estante', x: 150, y: 46, ancho: 50, alto: 20 },
    { id: 'estante2', nombre: 'Estante de abajo', tipo: 'estante', x: 150, y: 76, ancho: 56, alto: 24 },
    { id: 'mesada1', nombre: 'Mesada', tipo: 'mesada', x: 232, y: 110, ancho: 80, alto: 42 },
    { id: 'mesada2', nombre: 'Mesada chica', tipo: 'mesada', x: 365, y: 110, ancho: 66, alto: 42 },
    { id: 'mesa', nombre: 'Mesa', tipo: 'mesa', x: 238, y: 151, ancho: 90, alto: 34 },
    { id: 'suelo1', nombre: 'Rincón izquierdo', tipo: 'rincon_izq', x: 30, y: 186, ancho: 56, alto: 140 },
    { id: 'suelo2', nombre: 'Rincón derecho', tipo: 'rincon_der', x: 438, y: 186, ancho: 80, alto: 140 },
  ],
  recogibles: [
    { id: 'moneda', imagen: 'moneda', x: 200, y: 256, monedas: 8, frase: '¡Una moneda bajo la mesa! Para la alcancía. ¿Quién deja plata tirada? Ah, sí: yo.' },
  ],
};

/** Frente de la casa propia: se entra por la puerta. */
const JARDIN: Escenario = {
  id: 'jardin',
  lugar: 'casa',
  fondos: [[0, 'casa']],
  suelo: { x0: 20, x1: 460, y0: 196, y1: 262 },
  inicio: { x: 250, y: 232 },
  zonas: [
    { id: 'puerta', nombre: 'Entrar a casa', x0: 222, y0: 50, x1: 268, y1: 140, px: 245, py: 200,
      mirar: ['La puerta de MI casa. Todavía me cuesta creerlo. Pellizcame, pero no tan fuerte.', 'Tiene mi nombre en el buzón. Rupert. Con mayúscula y todo. Importantísimo.'],
      usar: { tipo: 'ir', a: 'casa' } },
    { id: 'buzon', nombre: 'Buzón', x0: 358, y0: 112, x1: 388, y1: 148, px: 372, py: 200,
      mirar: ['Mi buzón rojo. Llegan cartas, ¡y no son cuentas! Todavía. Me da miedo el futuro.'],
      usar: { tipo: 'texto', lineas: ['Una carta... “Gracias por inspirarnos”. Firmado: el barrio. Ahora tengo miedo de decepcionarlos.'] } },
    { id: 'jardin', nombre: 'Jardín', x0: 400, y0: 100, x1: 478, y1: 152, px: 420, py: 205,
      mirar: ['Mi jardín. Planté flores de todos los colores. Las plantas me odian menos que las palomas.'],
      usar: { tipo: 'texto', lineas: ['Riego las flores. Adentro puedo decorar los estantes y la mesa. Pongo un florero y ya soy decorador.'] } },
    { id: 'arbol', nombre: 'Árbol', x0: 0, y0: 0, x1: 120, y1: 150, px: 90, py: 205,
      mirar: ['Un árbol propio. Le voy a colgar una hamaca. Y un cartel: “Propiedad de Rupert. Palomas, a otro árbol”.', 'Me siento a la sombra. Cuántas cosas pasaron desde el callejón... Igual sigo oliendo un poco a callejón.'],
      usar: { tipo: 'siesta', x: 95, y: 214 } },
  ],
  recogibles: [
    { id: 'flor', imagen: 'flor', x: 140, y: 246, monedas: 2, frase: 'Una flor del jardín. La pongo en un vaso. Soy un hombre de refinamientos.' },
    { id: 'moneda', imagen: 'moneda', x: 330, y: 250, monedas: 8, frase: '¡Una moneda! Para la alcancía de la casa. Con esto compro... bueno, nada. Pero la tengo.' },
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

/** Escenarios a los que se llega desde otro del mismo lugar (acción "ir"). */
export const EXTRAS: Record<string, Escenario> = { jardin: JARDIN };

export function escenarioDeEtapa(etapa: number): Escenario {
  return ESCENARIOS[lugarDeEtapa(etapa)];
}

/** Escenario por su id; solo vale si pertenece al lugar donde vive Rupert en esa etapa. */
export function escenarioPorId(id: string | undefined, etapa: number): Escenario {
  const base = escenarioDeEtapa(etapa);
  const otro = id ? (EXTRAS[id] ?? Object.values(ESCENARIOS).find((e) => e.id === id)) : undefined;
  return otro && otro.lugar === base.lugar ? otro : base;
}

/** Visita corta a otro lugar al cumplir algunos hitos. */
export interface Visita {
  fondo: string;
  texto: string;
  x: number;
  y: number;
  escala: number;
}
export const VISITAS: Record<number, Visita> = {
  2: { fondo: 'barberia', texto: 'En la barbería del barrio: corte, afeitado y una charla de fútbol de la que no entendí nada. Asentí con convicción.', x: 330, y: 262, escala: 1.55 },
  4: { fondo: 'biblioteca', texto: 'En la biblioteca: Rupert armó su currículum y ya tiene teléfono. En “experiencia laboral” puso “sobreviviente”.', x: 170, y: 262, escala: 1.55 },
};

/** Fondo del lugar donde vive Rupert en esa etapa. */
export function fondoDeEtapa(etapa: number): string {
  const esc = escenarioDeEtapa(etapa);
  let clave = esc.fondos[0][1];
  for (const [desde, k] of esc.fondos) if (etapa >= desde) clave = k;
  return clave;
}

/** Todas las imágenes de fondo usadas por los escenarios (para precargarlas). */
export const FONDOS = [
  ...new Set([...Object.values(ESCENARIOS), ...Object.values(EXTRAS)].flatMap((e) => e.fondos.map(([, k]) => k))),
  ...Object.values(VISITAS).map((v) => v.fondo),
];

/** La ducha pública del escenario en esta etapa, si hay. */
export function duchaDe(esc: Escenario, etapa: number): Ducha | null {
  return esc.duchas?.find((d) => etapa >= (d.desde ?? 0) && etapa <= (d.hasta ?? 99)) ?? null;
}

/** Rectángulo de la ducha en el mundo (para tocarla) y su abertura (por donde entra Rupert). */
export function rectDucha(d: Ducha): { x0: number; y0: number; x1: number; y1: number; abertura: { x0: number; y0: number; x1: number; y1: number } } {
  if (d.puerta) return { ...d.puerta, abertura: { ...d.puerta } };
  const dib = DIBUJOS_DUCHA[d.dibujo ?? 'callejon'];
  const k = d.alto / dib.alto;
  const x0 = d.x - (dib.ancho * k) / 2;
  const y0 = d.y - d.alto;
  const a = dib.abertura;
  return {
    x0, y0, x1: x0 + dib.ancho * k, y1: d.y,
    abertura: { x0: x0 + a.x0 * k, y0: y0 + a.y0 * k, x1: x0 + a.x1 * k, y1: y0 + a.y1 * k },
  };
}

/** Zona tocable de la ducha (va primero, para ganarle a las zonas que tiene detrás). */
export function zonaDucha(d: Ducha): Zona {
  const r = rectDucha(d);
  return {
    id: 'ducha', nombre: d.puerta ? 'Baño público' : 'Ducha pública', x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, px: d.px, py: d.py,
    mirar: d.puerta
      ? ['La puerta del baño de la florería. Tiene ducha. Nadie sabe por qué una florería tiene ducha. Yo tampoco pregunto.', 'Agua caliente, jabón... y olor a rosas. Salgo oliendo a ramo de novia.']
      : ['Una ducha pública. Agua caliente... a veces. Cuando sale caliente es un acontecimiento.', 'Con jabón y shampoo salgo como nuevo. O, al menos, como usado con cuidado.'],
    usar: { tipo: 'ducha' },
  };
}
