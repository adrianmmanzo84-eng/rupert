/** Frases de Rupert y descripciones de la escena. Humor de situación, nunca sobre su pobreza. */

export type Lugar = 'cama' | 'contenedor' | 'puerta' | 'charco' | 'farola' | 'tuberia' | 'bolsas' | 'tarima' | 'rupert';

export const NOMBRES: Record<Lugar, string> = {
  cama: 'Cama de cartón',
  contenedor: 'Contenedor',
  puerta: 'Puerta trasera',
  charco: 'Charco',
  farola: 'Farola',
  tuberia: 'Tubería',
  bolsas: 'Bolsas de reciclaje',
  tarima: 'Tarima',
  rupert: 'Rupert',
};

export const MIRAR: Record<Lugar, string[]> = {
  cama: ['Mi suite presidencial. Cartón doble, vista al contenedor.', 'La manta tiene más agujeros que un queso, pero es mía.'],
  contenedor: ['El contenedor. Hay gente que lo llama basura; yo lo llamo "posibilidades".', 'Huele a aventura. Y a pescado.'],
  puerta: ['La puerta trasera de la panadería. De ahí sale el mejor olor del barrio.', 'Una vez se abrió y me dieron una medialuna. Fue un gran día.'],
  charco: ['Un charco. Refleja mejor que cualquier espejo que haya tenido.', 'Si lo miro mucho rato, me devuelve la mirada.'],
  farola: ['La farola parpadea en código Morse. Creo que dice "ánimo".', 'Mi única fuente de luz nocturna. Y de calefacción, si me acerco mucho.'],
  tuberia: ['Una tubería oxidada. Ahí viven los ratones más veloces del barrio.', 'Si apoyo la oreja, escucho a los ratones entrenando.'],
  bolsas: ['Lo que junto para reciclar. Separado, vale más.', 'Latas, botellas, cartón... un tesoro bien ordenado.'],
  tarima: ['Mi taller de bijouterie: una tarima y una lata llena de chapitas.', 'Con chapitas y un hilo hago collares. Los turistas los aman.'],
  rupert: ['Ese soy yo. Rupert. Desgarbado, pero con estilo.', 'Algún día voy a salir de este callejón. Con un poco de ayuda.'],
};

export const USAR: Partial<Record<Lugar, string[]>> = {
  puerta: ['Cerrada. Del otro lado huele a pan recién hecho.', 'Toco, pero nadie abre. El panadero debe estar amasando.'],
  charco: ['¿Lavarme en un charco? Tengo mis estándares... bajos, pero los tengo.'],
  farola: ['Si me apoyo, se apaga. Ya lo probé.'],
  tuberia: ['Los ratones no quieren correr ahora. Vuelve más tarde.'],
};

export const CHARLA_FELIZ = [
  '¡Hoy me siento con suerte! Bueno, con menos mala suerte.',
  'Gracias por pasar. Es lindo tener compañía en el callejón.',
  'Dicen que el que busca encuentra. Yo busco mucho.',
  'Un día voy a tener una casa con jardín. Y un perro. Y un sillón.',
];
export const CHARLA_HAMBRE = ['Mi estómago suena como la tubería. ¿Tendrás algo de comer?', 'Podría comerme un sándwich. O dos. O el cartón.'];
export const CHARLA_SUCIO = ['Creo que hasta las palomas me esquivan. Un jabón no vendría mal.', 'Necesito un baño. Urgente. Muy urgente.'];
export const CHARLA_TRISTE = ['Hoy no es mi mejor día...', 'Hay días grises. Hoy es uno de esos.'];

export function al<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}
