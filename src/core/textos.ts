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

/**
 * Epílogo de la primera parte (R041): se ve al cumplir la última meta y después desde el título.
 * Cada página es un recuerdo con su fondo y el Rupert de esa etapa; las dos últimas dejan abierta la segunda parte.
 */
export interface PaginaEpilogo {
  fondo: string;
  /** Etapa de Rupert que aparece (sin etapa: no aparece). */
  etapa?: number;
  x?: number;
  y?: number;
  /** Tamaño de Rupert (los interiores están dibujados más cerca). */
  escala?: number;
  /** De noche: la escena se oscurece. */
  noche?: boolean;
  /** Aparece la carta misteriosa. */
  carta?: boolean;
  texto: string;
}

export const EPILOGO: PaginaEpilogo[] = [
  {
    fondo: 'callejon_e0', etapa: 0, x: 150, y: 242,
    texto: 'Hace no tanto, mi dirección era «contenedor verde, al fondo a la izquierda». Mi colchón era un cartón y mi despertador, el camión de la basura. Puntualísimo, el desgraciado.',
  },
  {
    fondo: 'plaza', etapa: 3, x: 130, y: 236,
    texto: 'Después vinieron un baño, un corte de pelo y ropa sin agujeros. Bueno, sin agujeros nuevos. Armé un currículum: en «experiencia» puse «sobreviviente». No me llamaron por el currículum. Me llamaron por insistente.',
  },
  {
    fondo: 'ciudad', etapa: 5, x: 330, y: 242,
    texto: 'Repartí pedidos, trepé edificios, destapé caños y lavé más platos de los que voy a usar en toda mi vida. Cada moneda que aportaron fue un ladrillo. Literalmente: ahora tengo ladrillos.',
  },
  {
    fondo: 'casa', etapa: 9, x: 250, y: 244,
    texto: 'Hoy tengo casa. Con llave, con jardín y con un buzón que recibe cartas que no son de cobranzas. Todavía no sé dónde poner las manos. Pero ya no tengo frío.',
  },
  {
    fondo: 'casa_interior', etapa: 9, x: 300, y: 254, escala: 1.3,
    texto: 'Esto no lo hice solo. Lo hizo un barrio entero que decidió que un tipo del contenedor merecía otra oportunidad. Yo puse la cara de lástima. Ustedes pusieron todo lo demás. Gracias, vecinos.',
  },
  {
    fondo: 'casa_interior', noche: true,
    texto: 'Esa noche me acosté en una cama de verdad. Estaba por dormirme cuando alguien tocó la puerta. Tres golpes. Nadie toca la puerta de alguien que nunca tuvo puerta.',
  },
  {
    fondo: 'casa_interior', noche: true, carta: true,
    texto: 'No había nadie. Solo una caja de cartón, igualita a mi vieja cama. Adentro, una llave oxidada y una carta con mi nombre.',
  },
];

/** La carta que deja la puerta abierta a la segunda parte. */
export const CARTA_EPILOGO = 'Rupert:\nEl callejón te necesita.\nLos de antes, también.\nVen solo. Trae jabón.\n\n— Alguien que no te olvidó';

/** Cartel final. */
export const CIERRE_EPILOGO = {
  titulo: 'Fin de la primera parte',
  frase: 'Por primera vez, Rupert tenía algo que perder.\nY por primera vez, alguien lo necesitaba a él.',
  sigue: 'Continuará en «Rupert 2: De vuelta al barrio»',
  gracias: 'Gracias por jugar, vecino.',
};

/**
 * Metas intermedias (R043): tres pasitos dentro de cada meta (al 25, 50 y 75 % del fondo), para que pase
 * algo cada pocos días también en las metas largas. Índice = etapa actual.
 */
export const HITOS_INTERMEDIOS: [string, string, string][] = [
  ['Conseguí un jabón casi entero. El «casi» es otra historia.', 'Me prestaron una olla. No tengo qué cocinar, pero ya tengo dónde.', 'Encontré una toalla. Huele a perro mojado, pero el perro no la reclamó.'],
  ['Me miré en un charco y el charco se asustó. Hay que hacer algo.', 'El barbero dijo que me atiende «si me baño antes». Ya me bañé. Trato cerrado.', 'Practiqué una sonrisa frente a una vidriera. La vidriera no me la devolvió.'],
  ['Remendé el saco. Ahora tiene más remiendo que saco.', 'Me probé un pantalón en la feria. Me queda. Es la primera vez que algo me queda.', 'Ya elegí el color de la camisa: «limpia».'],
  ['Anoté mis habilidades en una servilleta. Sobró servilleta.', 'Me regalaron un cargador. Ahora solo me falta el teléfono. Voy en orden inverso.', 'Practiqué la entrevista con una paloma. Me rechazó, pero con respeto.'],
  ['Inflé las ruedas de una bici prestada. Una sola, pero con mucho entusiasmo.', 'Me aprendí el mapa del barrio. Ahora me pierdo con conocimiento de causa.', 'Me compré un casco. Por primera vez algo me protege la cabeza, además del pelo.'],
  ['Vi una pieza en alquiler. El dueño me miró raro, pero me miró.', 'Junté para el depósito. Bueno, para la mitad. Bueno, para el recibo.', 'Me compré un llavero. No abre nada todavía, pero lo practico.'],
  ['Me hice socio de la biblioteca. La bibliotecaria me hizo «shh» y me sentí incluido.', 'Compré un cuaderno y escribí mi nombre en la tapa. Primer tema aprobado.', 'Resolví una ecuación. Fue sin querer, pero cuenta.'],
  ['Aprobé un parcial. El profe dijo «increíble». Creo que era un elogio.', 'Saqué el registro. El instructor bajó del auto llorando. De emoción, espero.', 'Fui a ver un auto usado. Tenía más kilómetros que yo, y eso es mucho decir.'],
  ['Abrí una cuenta en el banco. El banco todavía no se recupera.', 'Fui a ver una casa. Tiene jardín. El jardín tiene un gnomo. Ya lo quiero.', 'Firmé el primer papel de la casa. Con mi letra, que es casi legible.'],
];

/** Porcentajes del fondo en que se celebra cada meta intermedia. */
export const CUARTOS = [0.25, 0.5, 0.75];

/**
 * La meta intermedia que toca celebrar ahora, si hay: la más alta ya alcanzada que no se vio. Las más bajas
 * que se saltearon se dan por vistas (no se festejan tres seguidas).
 */
export function hitoIntermedio(etapa: number, fondo: number, meta: number | null, vistos: string[]): { claves: string[]; texto: string } | null {
  const textos = HITOS_INTERMEDIOS[etapa];
  if (!textos || !meta) return null;
  let k = -1;
  CUARTOS.forEach((c, i) => {
    if (fondo >= c * meta) k = i;
  });
  if (k < 0 || vistos.includes(`${etapa}.${k}`)) return null;
  const claves = CUARTOS.map((_, i) => `${etapa}.${i}`).slice(0, k + 1).filter((c) => !vistos.includes(c));
  return { claves, texto: textos[k] };
}
