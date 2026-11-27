/**
 * Frases de Rupert (R032). Humor ácido e irónico, al estilo de las aventuras gráficas clásicas: Rupert se ríe de sí mismo
 * y de sus desgracias, y es absurdo e inocente. Las burlas son siempre contra él, nunca contra otras personas.
 * Los textos de cada lugar están en lugares.ts.
 */

export const CHARLA_FELIZ = [
  '¡Hoy me siento con suerte! Bueno, con menos mala suerte.',
  'Gracias por pasar. Es lindo tener compañía que no sea una paloma con mala cara.',
  'Dicen que el que busca encuentra. Yo busco mucho. Encuentro latas. Casi todo latas.',
  'Un día voy a tener una casa con jardín. Y un perro. Y un sillón. Y una vida. Pero primero el sillón.',
  '¿Sabías que soy experto en cartones? Podría dar conferencias. Nadie me invitó.',
  'Dicen que el dinero no hace la felicidad. Me gustaría comprobarlo personalmente.',
  'Estoy tan contento que casi me olvido de que no tengo nada.',
  'Hoy desayuné sándwich y almorcé sándwich. Mañana pienso variar: sándwich.',
  'Mi plan de vida es sencillo: no morirme. Va mejor de lo esperado.',
];
export const CHARLA_HAMBRE = [
  'Mi estómago suena como la tubería. ¿Tendrás algo de comer? Acepto cualquier cosa, menos la tubería.',
  'Podría comerme un sándwich. O dos. O el cartón. Ya probé el cartón: le falta sal.',
  'Tengo tanta hambre que las palomas me empiezan a parecer gallinas. Se dieron cuenta y se alejaron.',
  'Anoche soñé con un asado. Me desperté mordiendo el cartón.',
];
export const CHARLA_SUCIO = [
  'Creo que hasta las palomas me esquivan. Y las palomas comen de la basura. Un jabón no vendría mal.',
  'Necesito un baño. Urgente. Muy urgente. Hasta mi sombra camina a dos metros.',
  'Mis zapatos y yo hace tiempo que no nos bañamos. Se llevan muy bien.',
  'Me dijeron que huelo a aventura. Era una forma amable de decir otra cosa.',
];
export const CHARLA_TRISTE = [
  'Hoy no es mi mejor día... Aunque tampoco tengo muchos buenos para comparar.',
  'Hay días grises. Hoy es uno de esos. Con mi suerte, mañana viene en blanco y negro.',
  'Me siento como un calcetín perdido: nadie me busca, pero tengo mucho para dar.',
  'Hoy me levanté con el pie izquierdo. Y con el derecho. Con los dos, la verdad.',
];

/** Lo que logra Rupert al llenar cada meta (índice = etapa a la que llega). */
export const HITOS = [
  '',
  '¡Rupert se dio un baño y comió caliente! Sí, el mismo día. Qué derroche.',
  '¡Corte de pelo y afeitado! Parece otro. Más bien parece alguien.',
  '¡Ropa nueva! Ya puede ir a buscar trabajo. Y a no espantar a los entrevistadores.',
  '¡Tiene teléfono y currículum! El currículum es corto, pero muy sincero.',
  '¡Consiguió trabajo de repartidor! El jefe confía en él. Pobre jefe.',
  '¡Alquiló su propia pieza! Con techo y todo. Está tan emocionado que no sabe dónde poner las manos.',
  '¡Empezó a estudiar de noche! Dormía mal igual, así que al menos aprovecha.',
  '¡Se compró un auto usado! Tiene cuatro ruedas. Tres funcionan perfecto.',
  '¡Rupert tiene su casa propia! Del contenedor a la escritura. Nadie lo vio venir, ni él.',
];

export function al<T>(lista: T[]): T {
  return lista[Math.floor(Math.random() * lista.length)];
}
