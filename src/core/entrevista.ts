/**
 * Entrevista de trabajo (plaza, etapa 4): cinco preguntas del entrevistador, cada una con tres respuestas
 * de Rupert (una buena, una regular y una mala, casi siempre graciosa). Datos y reglas puras, sin Phaser.
 */

export type Calidad = 'buena' | 'regular' | 'mala';

export interface Respuesta {
  texto: string;
  calidad: Calidad;
  /** Lo que contesta el entrevistador. */
  reaccion: string;
}

export interface Pregunta {
  texto: string;
  respuestas: Respuesta[];
}

export const PREGUNTAS: Pregunta[] = [
  {
    texto: 'Cuénteme un poco de usted.',
    respuestas: [
      { texto: 'Soy constante. Junté reciclaje todos los días, hiciera frío o calor.', calidad: 'buena', reaccion: 'Constancia. Eso me gusta.' },
      { texto: 'Bueno... soy alto. Y flaco.', calidad: 'regular', reaccion: 'Eso ya lo veo, gracias.' },
      { texto: 'Mi ratón ganó tres carreras seguidas.', calidad: 'mala', reaccion: '¿Su... ratón?' },
    ],
  },
  {
    texto: '¿Por qué quiere este trabajo?',
    respuestas: [
      { texto: 'Quiero un trabajo estable para dejar de vivir en la plaza y seguir progresando.', calidad: 'buena', reaccion: 'Una respuesta honesta. Se agradece.' },
      { texto: 'Me dijeron que acá hay café gratis.', calidad: 'regular', reaccion: 'Hay café. No es gratis.' },
      { texto: 'Las palomas me echaron del banco.', calidad: 'mala', reaccion: 'No sé qué responder a eso.' },
    ],
  },
  {
    texto: '¿Cuál es su mayor defecto?',
    respuestas: [
      { texto: 'A veces me cuesta pedir ayuda, pero estoy aprendiendo a hacerlo.', calidad: 'buena', reaccion: 'Reconocerlo ya es un paso.' },
      { texto: 'Soy demasiado perfeccionista.', calidad: 'regular', reaccion: 'Todos dicen eso.' },
      { texto: 'Me duermo en cualquier banco.', calidad: 'mala', reaccion: 'Espero que no en este escritorio.' },
    ],
  },
  {
    texto: '¿Tiene experiencia con clientes?',
    respuestas: [
      { texto: 'Vendí collares en la calle: escuchaba qué pedía cada cliente y se lo armaba.', calidad: 'buena', reaccion: 'Eso es atención al cliente de verdad.' },
      { texto: 'Le hablo mucho a la gente. A veces me contestan.', calidad: 'regular', reaccion: 'Mmm. Algo es algo.' },
      { texto: 'Los clientes me caen mal.', calidad: 'mala', reaccion: 'Anotado. Muy anotado.' },
    ],
  },
  {
    texto: '¿Dónde se ve en cinco años?',
    respuestas: [
      { texto: 'Con un oficio, una casa propia y ayudando a otros a salir adelante.', calidad: 'buena', reaccion: 'Tiene metas claras.' },
      { texto: 'Acá, supongo. Si me toman.', calidad: 'regular', reaccion: 'Bueno, primero veamos hoy.' },
      { texto: 'En su silla.', calidad: 'mala', reaccion: '...' },
    ],
  },
  {
    texto: '¿Cómo maneja la presión?',
    respuestas: [
      { texto: 'Lavé platos en un bar en hora pico. Respiro, ordeno y voy de a uno.', calidad: 'buena', reaccion: 'Experiencia real. Bien.' },
      { texto: 'Con mate.', calidad: 'regular', reaccion: 'Respetable, pero no alcanza.' },
      { texto: 'Me escondo detrás de un contenedor.', calidad: 'mala', reaccion: 'Acá no hay contenedores.' },
    ],
  },
  {
    texto: '¿Es puntual?',
    respuestas: [
      { texto: 'Sí. Me levanto con el sol desde hace años.', calidad: 'buena', reaccion: 'Perfecto, entramos temprano.' },
      { texto: 'Casi siempre. No tengo reloj, pero tengo intuición.', calidad: 'regular', reaccion: 'Le vamos a dar un reloj.' },
      { texto: '¿Qué hora es?', calidad: 'mala', reaccion: 'Tarde, para esta respuesta.' },
    ],
  },
  {
    texto: '¿Por qué deberíamos elegirlo a usted?',
    respuestas: [
      { texto: 'Porque empecé de cero, aprendo rápido y no me rindo.', calidad: 'buena', reaccion: 'Me convenció.' },
      { texto: 'Porque traje mi mejor bufanda.', calidad: 'regular', reaccion: 'Es una linda bufanda, eso sí.' },
      { texto: 'Porque los demás candidatos se fueron.', calidad: 'mala', reaccion: 'No se fueron. Están afuera.' },
    ],
  },
  {
    texto: '¿Sabe trabajar en equipo?',
    respuestas: [
      { texto: 'Sí. En la calle aprendí que solo no se llega lejos.', calidad: 'buena', reaccion: 'Muy cierto.' },
      { texto: 'Con las palomas nos organizamos bastante.', calidad: 'regular', reaccion: 'Es... un comienzo.' },
      { texto: 'Prefiero que el equipo trabaje y yo miro.', calidad: 'mala', reaccion: 'Eso se llama ser jefe, y no es el puesto.' },
    ],
  },
  {
    texto: '¿Tiene alguna pregunta para nosotros?',
    respuestas: [
      { texto: '¿Qué es lo que más valoran de las personas que trabajan acá?', calidad: 'buena', reaccion: 'Buena pregunta. El compromiso.' },
      { texto: '¿Cuándo es el almuerzo?', calidad: 'regular', reaccion: 'A las doce. Tranquilo.' },
      { texto: '¿Me presta para el colectivo?', calidad: 'mala', reaccion: 'Empezamos mal la relación laboral.' },
    ],
  },
];

export const PREGUNTAS_POR_ENTREVISTA = 5;
export const SEGUNDOS_POR_PREGUNTA = 12;

export const PUNTOS_RESPUESTA: Record<Calidad, number> = { buena: 10, regular: 4, mala: 0 };
/** Premio extra si lo contratan (todas buenas o casi). */
export const PREMIO_CONTRATADO = 10;
export const PUNTOS_PARA_CONTRATO = 40;

function mezclar<T>(xs: T[], azar: () => number): T[] {
  const r = [...xs];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

/** Cinco preguntas distintas al azar, con las respuestas en orden mezclado. */
export function armarEntrevista(azar: () => number = Math.random): Pregunta[] {
  return mezclar(PREGUNTAS, azar)
    .slice(0, PREGUNTAS_POR_ENTREVISTA)
    .map((p) => ({ texto: p.texto, respuestas: mezclar(p.respuestas, azar) }));
}

export function resultadoEntrevista(puntos: number): { contratado: boolean; total: number; veredicto: string } {
  const contratado = puntos >= PUNTOS_PARA_CONTRATO;
  const veredicto = contratado
    ? '¡Está contratado! Empieza el lunes.'
    : puntos >= 24
      ? 'Lo vamos a llamar. Siga practicando.'
      : 'Gracias por venir. Suerte.';
  return { contratado, total: puntos + (contratado ? PREMIO_CONTRATADO : 0), veredicto };
}
