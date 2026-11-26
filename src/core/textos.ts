/** Frases de Rupert. Humor de situación, nunca sobre su pobreza. Los textos de cada lugar están en lugares.ts. */

export const CHARLA_FELIZ = [
  '¡Hoy me siento con suerte! Bueno, con menos mala suerte.',
  'Gracias por pasar. Es lindo tener compañía.',
  'Dicen que el que busca encuentra. Yo busco mucho.',
  'Un día voy a tener una casa con jardín. Y un perro. Y un sillón.',
];
export const CHARLA_HAMBRE = ['Mi estómago suena como la tubería. ¿Tendrás algo de comer?', 'Podría comerme un sándwich. O dos. O el cartón.'];
export const CHARLA_SUCIO = ['Creo que hasta las palomas me esquivan. Un jabón no vendría mal.', 'Necesito un baño. Urgente. Muy urgente.'];
export const CHARLA_TRISTE = ['Hoy no es mi mejor día...', 'Hay días grises. Hoy es uno de esos.'];

/** Lo que logra Rupert al llenar cada meta (índice = etapa a la que llega). */
export const HITOS = [
  '',
  '¡Rupert se dio un baño y comió caliente!',
  '¡Corte de pelo y afeitado! Parece otro.',
  '¡Ropa nueva! Ya puede ir a buscar trabajo.',
  '¡Tiene teléfono y currículum!',
  '¡Consiguió trabajo de repartidor!',
  '¡Alquiló su propia pieza!',
  '¡Empezó a estudiar de noche!',
  '¡Se compró un auto usado!',
  '¡Rupert tiene su casa propia!',
];

export function al<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}
