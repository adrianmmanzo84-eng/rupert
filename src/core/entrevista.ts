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
      { texto: 'Soy constante. Junté reciclaje todos los días, con frío o con calor. Más con frío.', calidad: 'buena', reaccion: 'Constancia. Eso me gusta.' },
      { texto: 'Bueno... soy alto. Y flaco. Y... eso.', calidad: 'regular', reaccion: 'Eso lo veo solo, gracias.' },
      { texto: 'Mi ratón ganó tres carreras seguidas.', calidad: 'mala', reaccion: '¿Su... ratón? ¿Se presenta con un ratón?' },
    ],
  },
  {
    texto: '¿Por qué quiere este trabajo?',
    respuestas: [
      { texto: 'Quiero un trabajo estable para dejar de vivir en la plaza y seguir progresando.', calidad: 'buena', reaccion: 'Una respuesta honesta. Se agradece.' },
      { texto: 'Me dijeron que acá hay café gratis.', calidad: 'regular', reaccion: 'Hay café. No es gratis. Ni lo va a ser.' },
      { texto: 'Las palomas me echaron del banco. Del de la plaza. El otro también me echó.', calidad: 'mala', reaccion: 'Voy a necesitar un momento para procesar eso.' },
    ],
  },
  {
    texto: '¿Cuál es su mayor defecto?',
    respuestas: [
      { texto: 'A veces me cuesta pedir ayuda, pero estoy aprendiendo a hacerlo.', calidad: 'buena', reaccion: 'Reconocerlo ya es un paso.' },
      { texto: 'Soy demasiado perfeccionista.', calidad: 'regular', reaccion: 'Todos dicen eso. Usted lo dice con un zapato desatado.' },
      { texto: 'Me duermo en cualquier banco. Y en cualquier silla. A veces, parado.', calidad: 'mala', reaccion: 'Espero que no sobre este escritorio. Es caro.' },
    ],
  },
  {
    texto: '¿Tiene experiencia con clientes?',
    respuestas: [
      { texto: 'Vendí collares en la calle: escuchaba qué pedía cada cliente y se lo armaba.', calidad: 'buena', reaccion: 'Eso es atención al cliente de verdad.' },
      { texto: 'Le hablo mucho a la gente. A veces me contestan.', calidad: 'regular', reaccion: 'Mmm. Una conversación con cincuenta por ciento de respuesta. Algo es algo.' },
      { texto: 'Los clientes me caen mal. Sobre todo los que no compran.', calidad: 'mala', reaccion: 'Anotado. Muy anotado.' },
    ],
  },
  {
    texto: '¿Dónde se ve en cinco años?',
    respuestas: [
      { texto: 'Con un oficio, una casa propia y ayudando a otros a salir adelante.', calidad: 'buena', reaccion: 'Tiene metas claras.' },
      { texto: 'Acá, supongo. Si me toman. Y si me dejan.', calidad: 'regular', reaccion: 'Bueno, primero veamos si sobrevive a hoy.' },
      { texto: 'En su silla.', calidad: 'mala', reaccion: 'La silla tiene dueño. Y tiene seguro.' },
    ],
  },
  {
    texto: '¿Cómo maneja la presión?',
    respuestas: [
      { texto: 'Lavé platos en un bar en hora pico. Respiro, ordeno y voy de a uno.', calidad: 'buena', reaccion: 'Experiencia real. Bien.' },
      { texto: 'Con mate.', calidad: 'regular', reaccion: 'Respetable, pero no alcanza.' },
      { texto: 'Me escondo detrás de un contenedor. Es mi técnica de gestión.', calidad: 'mala', reaccion: 'Acá no hay contenedores. Aunque puedo pedir uno.' },
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
      { texto: 'Porque los demás candidatos se fueron.', calidad: 'mala', reaccion: 'No se fueron. Están afuera, mirándolo por la ventana.' },
    ],
  },
  {
    texto: '¿Sabe trabajar en equipo?',
    respuestas: [
      { texto: 'Sí. En la calle aprendí que solo no se llega lejos.', calidad: 'buena', reaccion: 'Muy cierto.' },
      { texto: 'Con las palomas nos organizamos bastante. Ellas dan las órdenes.', calidad: 'regular', reaccion: 'Es... un comienzo.' },
      { texto: 'Prefiero que el equipo trabaje y yo miro.', calidad: 'mala', reaccion: 'Eso se llama ser jefe, y no es el puesto.' },
    ],
  },
  {
    texto: '¿Tiene alguna pregunta para nosotros?',
    respuestas: [
      { texto: '¿Qué es lo que más valoran de las personas que trabajan acá?', calidad: 'buena', reaccion: 'Buena pregunta. El compromiso.' },
      { texto: '¿Cuándo es el almuerzo?', calidad: 'regular', reaccion: 'A las doce. Tranquilo, ya noté que le importa.' },
      { texto: '¿Me presta para el colectivo?', calidad: 'mala', reaccion: 'Empezamos mal la relación laboral.' },
    ],
  },  {
    texto: '¿Qué hizo en su último trabajo?',
    respuestas: [
      { texto: 'Lavaba platos en un bar. Nunca rompí uno... bueno, casi nunca.', calidad: 'buena', reaccion: 'Honesto y con experiencia.' },
      { texto: 'Juntaba cosas.', calidad: 'regular', reaccion: '¿Qué tipo de cosas? ...Mejor no me diga.' },
      { texto: 'Dormir. Era el mejor del bar. Rendimiento récord.', calidad: 'mala', reaccion: 'Eso no figura en ningún puesto. Ni en el mío.' },
    ],
  },
  {
    texto: '¿Cómo reacciona ante una crítica?',
    respuestas: [
      { texto: 'Escucho, pregunto qué puedo mejorar y lo intento de nuevo.', calidad: 'buena', reaccion: 'Exactamente lo que buscamos.' },
      { texto: 'Me pongo triste y me como una galletita. Si hay.', calidad: 'regular', reaccion: 'Al menos es sincero.' },
      { texto: 'Critico de vuelta, pero más fuerte.', calidad: 'mala', reaccion: 'Mejor no lo pongamos a prueba.' },
    ],
  },
  {
    texto: '¿Sabe usar una computadora?',
    respuestas: [
      { texto: 'Lo básico, y aprendo rápido. En la biblioteca practico todas las semanas.', calidad: 'buena', reaccion: 'Con ganas de aprender alcanza.' },
      { texto: 'Sé prenderla. Apagarla me cuesta más.', calidad: 'regular', reaccion: 'Le vamos a enseñar. Con paciencia. Mucha.' },
      { texto: '¿Es esa caja que hace ruido?', calidad: 'mala', reaccion: 'Esa es la impresora.' },
    ],
  },
  {
    texto: '¿Qué hace en su tiempo libre?',
    respuestas: [
      { texto: 'Leo libros prestados y aprendo cosas nuevas.', calidad: 'buena', reaccion: 'Muy bien. La lectura suma.' },
      { texto: 'Miro la fuente de la plaza. Es mejor que la tele. Y es gratis.', calidad: 'regular', reaccion: 'Relajante, supongo.' },
      { texto: 'Discuto con una paloma gris.', calidad: 'mala', reaccion: '¿Y quién gana?' },
    ],
  },
  {
    texto: '¿Cuánto pretende cobrar?',
    respuestas: [
      { texto: 'Lo justo para el puesto. Prefiero empezar y demostrar lo que valgo.', calidad: 'buena', reaccion: 'Una actitud razonable.' },
      { texto: 'Lo que me den, y un sándwich.', calidad: 'regular', reaccion: 'El sándwich no está incluido.' },
      { texto: 'Lo mismo que usted, más un poquito.', calidad: 'mala', reaccion: 'Ambicioso. Y la verdad, yo tampoco gano tanto.' },
    ],
  },
  {
    texto: '¿Qué haría si un cliente se enoja?',
    respuestas: [
      { texto: 'Lo escucho con calma, me disculpo y busco una solución.', calidad: 'buena', reaccion: 'Perfecto. Calma y solución.' },
      { texto: 'Le ofrezco un caramelo.', calidad: 'regular', reaccion: 'Puede funcionar... con los niños.' },
      { texto: 'Me escapo por la puerta de atrás.', calidad: 'mala', reaccion: 'No tenemos puerta de atrás. Tuvimos, pero la usaron.' },
    ],
  },
  {
    texto: '¿Por qué dejó su trabajo anterior?',
    respuestas: [
      { texto: 'Era temporal. Ahora busco algo estable donde crecer.', calidad: 'buena', reaccion: 'Entendible. Bien.' },
      { texto: 'El bar cerró por las vacaciones.', calidad: 'regular', reaccion: 'Mala suerte. Del bar, más que suya.' },
      { texto: 'Me comí las aceitunas de la barra.', calidad: 'mala', reaccion: '¿Todas?' },
    ],
  },
  {
    texto: '¿Tiene referencias?',
    respuestas: [
      { texto: 'Sí, el dueño del bar y Don Tito, el del kiosco, pueden hablar de mí.', calidad: 'buena', reaccion: 'Los vamos a llamar. Bien.' },
      { texto: 'Las palomas de la plaza me conocen bien.', calidad: 'regular', reaccion: 'No atienden el teléfono.' },
      { texto: 'Prefiero que no llame a nadie.', calidad: 'mala', reaccion: 'Eso me preocupa.' },
    ],
  },
  {
    texto: 'Cuénteme un logro del que esté orgulloso.',
    respuestas: [
      { texto: 'Junté mis primeros ahorros moneda a moneda y me compré ropa para hoy.', calidad: 'buena', reaccion: 'Eso habla muy bien de usted.' },
      { texto: 'Una vez encontré dos monedas en el mismo día.', calidad: 'regular', reaccion: 'Un buen día. Dos monedas. Una fortuna.' },
      { texto: 'Le gané una carrera a un ratón. Sin ayuda.', calidad: 'mala', reaccion: 'Prefiero no preguntar.' },
    ],
  },
  {
    texto: '¿Cómo organiza su día?',
    respuestas: [
      { texto: 'Me levanto temprano, hago lo más importante primero y anoto lo pendiente.', calidad: 'buena', reaccion: 'Ordenado. Me gusta.' },
      { texto: 'Según dónde haga sol.', calidad: 'regular', reaccion: 'Acá adentro siempre hay luz.' },
      { texto: 'No lo organizo. El día me organiza a mí.', calidad: 'mala', reaccion: 'Eso explica bastante.' },
    ],
  },
  {
    texto: '¿Puede trabajar los fines de semana?',
    respuestas: [
      { texto: 'Sí, tengo disponibilidad. Avíseme con tiempo y me organizo.', calidad: 'buena', reaccion: 'Excelente disponibilidad.' },
      { texto: 'Los domingos tengo partido de truco.', calidad: 'regular', reaccion: 'Se puede arreglar. ¿El truco es por plata o por orgullo?' },
      { texto: '¿Los fines de semana existen para trabajar?', calidad: 'mala', reaccion: 'En este puesto, a veces sí.' },
    ],
  },
  {
    texto: '¿Qué sabe de nuestra empresa?',
    respuestas: [
      { texto: 'Que son del barrio y que tratan bien a la gente. Pregunté antes de venir.', calidad: 'buena', reaccion: 'Vino preparado. Muy bien.' },
      { texto: 'Que tienen una puerta muy linda.', calidad: 'regular', reaccion: 'Es de roble, gracias.' },
      { texto: 'Nada, entré porque llovía.', calidad: 'mala', reaccion: 'Ya paró de llover, ¿eh?' },
    ],
  },
  {
    texto: 'Si encuentra una billetera en la calle, ¿qué hace?',
    respuestas: [
      { texto: 'Busco al dueño o la llevo a la comisaría. No es mía.', calidad: 'buena', reaccion: 'La honestidad vale oro.' },
      { texto: 'Miro si tiene una foto linda.', calidad: 'regular', reaccion: 'Curioso, pero no es la idea.' },
      { texto: 'Depende de cuánto tenga adentro.', calidad: 'mala', reaccion: 'Respuesta equivocada. Interesante, pero equivocada.' },
    ],
  },
  {
    texto: '¿Cómo aprende algo nuevo?',
    respuestas: [
      { texto: 'Pregunto, miro cómo lo hacen otros y practico hasta que me sale.', calidad: 'buena', reaccion: 'Así se aprende.' },
      { texto: 'Mirando tutoriales... en la vidriera de la casa de electrodomésticos.', calidad: 'regular', reaccion: 'Ingenioso, al menos.' },
      { texto: 'No aprendo. Ya sé todo.', calidad: 'mala', reaccion: 'Qué suerte la suya. Y qué mala la nuestra.' },
    ],
  },
  {
    texto: '¿Qué hace si termina su tarea antes de tiempo?',
    respuestas: [
      { texto: 'Pregunto si puedo ayudar en otra cosa.', calidad: 'buena', reaccion: 'Eso es iniciativa.' },
      { texto: 'Repaso lo que hice, por las dudas.', calidad: 'regular', reaccion: 'Prolijo. Está bien.' },
      { texto: 'Una siestita rápida.', calidad: 'mala', reaccion: 'Acá no hay bancos de plaza.' },
    ],
  },
  {
    texto: '¿Cómo se lleva con los jefes?',
    respuestas: [
      { texto: 'Bien. Respeto las indicaciones y, si no entiendo algo, pregunto.', calidad: 'buena', reaccion: 'Es lo que esperamos.' },
      { texto: 'Nunca tuve un jefe que no fuera una paloma.', calidad: 'regular', reaccion: 'Esta vez sería una persona.' },
      { texto: 'Los jefes me tienen miedo.', calidad: 'mala', reaccion: 'Yo no, se lo aseguro.' },
    ],
  },
  {
    texto: '¿Qué aprendió viviendo en la calle?',
    respuestas: [
      { texto: 'A no rendirme, a valorar cada ayuda y a ayudar cuando puedo.', calidad: 'buena', reaccion: 'Eso no se enseña en ningún curso.' },
      { texto: 'Dónde están los mejores bancos.', calidad: 'regular', reaccion: 'Información valiosa. Para otro puesto.' },
      { texto: 'Que el cartón no abriga nada.', calidad: 'mala', reaccion: 'Lo lamento. Pero no responde la pregunta.' },
    ],
  },
  {
    texto: '¿Puede empezar pronto?',
    respuestas: [
      { texto: 'Sí, puedo empezar cuando ustedes lo necesiten.', calidad: 'buena', reaccion: 'Perfecto.' },
      { texto: 'En cuanto termine de digerir el almuerzo. Que fue ayer.', calidad: 'regular', reaccion: 'Tómese su tiempo... poco.' },
      { texto: 'El año que viene, si no llueve.', calidad: 'mala', reaccion: 'Necesitamos a alguien antes.' },
    ],
  },
  {
    texto: '¿Cómo cuida las herramientas de trabajo?',
    respuestas: [
      { texto: 'Las limpio, las guardo en su lugar y aviso si algo se rompe.', calidad: 'buena', reaccion: 'Responsable. Muy bien.' },
      { texto: 'Les pongo nombre. Ayuda a no perderlas.', calidad: 'regular', reaccion: 'Original, al menos.' },
      { texto: 'Las vendo cuando ya no las uso.', calidad: 'mala', reaccion: 'Son de la empresa, eh.' },
    ],
  },
  {
    texto: 'Si pudiera describirse con una palabra, ¿cuál sería?',
    respuestas: [
      { texto: 'Perseverante.', calidad: 'buena', reaccion: 'Una gran palabra.' },
      { texto: 'Flaco. Con mucho potencial.', calidad: 'regular', reaccion: 'Eso es más una descripción.' },
      { texto: 'Hambriento.', calidad: 'mala', reaccion: 'Le convido un caramelo, pero no ayuda.' },
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

/** Preguntas de las últimas entrevistas: se evitan para que no se repitan seguido. */
const recientes: string[] = [];
const MEMORIA = PREGUNTAS.length - PREGUNTAS_POR_ENTREVISTA * 2;

/** Cinco preguntas distintas al azar (primero las que no salieron hace poco), con las respuestas mezcladas. */
export function armarEntrevista(azar: () => number = Math.random): Pregunta[] {
  const nuevas = mezclar(PREGUNTAS.filter((p) => !recientes.includes(p.texto)), azar);
  const viejas = recientes.map((t) => PREGUNTAS.find((p) => p.texto === t)!).filter(Boolean);
  const elegidas = [...nuevas, ...viejas].slice(0, PREGUNTAS_POR_ENTREVISTA);
  for (const p of elegidas) {
    const i = recientes.indexOf(p.texto);
    if (i >= 0) recientes.splice(i, 1);
    recientes.push(p.texto);
  }
  while (recientes.length > MEMORIA) recientes.shift();
  return elegidas.map((p) => ({ texto: p.texto, respuestas: mezclar(p.respuestas, azar) }));
}

export function resultadoEntrevista(puntos: number): { contratado: boolean; total: number; veredicto: string } {
  const contratado = puntos >= PUNTOS_PARA_CONTRATO;
  const veredicto = contratado
    ? '¡Está contratado! Empieza el lunes. Sí, el lunes: ese día horrible.'
    : puntos >= 24
      ? 'Lo vamos a llamar. (No lo vamos a llamar.) Siga practicando.'
      : 'Gracias por venir. Suerte. La va a necesitar.';
  return { contratado, total: puntos + (contratado ? PREMIO_CONTRATADO : 0), veredicto };
}
