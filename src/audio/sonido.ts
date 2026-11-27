/**
 * Sonido de Rupert (R042): efectos, música y la «voz» de Rupert, todo sintetizado con Web Audio.
 * No hay archivos de audio: cada efecto es una receta de tonos y ruido, y cada tema de música se arma a partir
 * de una progresión de acordes con una melodía fija (semilla), así que suena siempre igual. Es provisorio:
 * se puede reemplazar por música compuesta sin tocar el resto del juego (las escenas solo piden «moneda» o «plaza»).
 */
import { type Preferencias, preferencias } from './preferencias';

export type Efecto =
  | 'toque' | 'abrir' | 'cerrar' | 'moneda' | 'aporte' | 'acierto' | 'error' | 'combo' | 'record' | 'meta'
  | 'golpe' | 'salto' | 'tic' | 'aviso' | 'fin' | 'agua' | 'golpesPuerta' | 'puerta' | 'comer' | 'pop'
  | 'giro' | 'chispa' | 'caer' | 'tecla' | 'festejo';

export type Tema = 'callejon' | 'plaza' | 'ciudad' | 'interior' | 'changa' | 'titulo' | 'epilogo';

let ctx: AudioContext | null = null;
let maestro: GainNode;
let bus: { musica: GainNode; efectos: GainNode };
let ruidoBuf: AudioBuffer;

const VOL_MUSICA = 0.16;
const VOL_EFECTOS = 0.5;

function contexto(): AudioContext | null {
  if (ctx) return ctx;
  const C = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  maestro = ctx.createGain();
  maestro.connect(ctx.destination);
  bus = { musica: ctx.createGain(), efectos: ctx.createGain() };
  bus.musica.connect(maestro);
  bus.efectos.connect(maestro);
  aplicarPreferencias(preferencias());
  ruidoBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = ruidoBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** El navegador solo deja sonar después de un toque: se llama en el primer toque y al volver a la app. */
export function iniciarSonido(): void {
  const desbloquear = () => {
    const c = contexto();
    if (c && c.state !== 'running') void c.resume();
  };
  for (const ev of ['pointerdown', 'touchend', 'keydown']) document.addEventListener(ev, desbloquear, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') void ctx.suspend();
    else void ctx.resume();
  });
}

export function aplicarPreferencias(p: Preferencias): void {
  if (!ctx) return;
  bus.musica.gain.setTargetAtTime(p.musica ? VOL_MUSICA : 0, ctx.currentTime, 0.05);
  bus.efectos.gain.setTargetAtTime(p.efectos ? VOL_EFECTOS : 0, ctx.currentTime, 0.02);
}

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/** Un tono con envolvente corta; `a` es el destino (efectos o música). */
function tono(f: number, dur: number, o: { tipo?: OscillatorType; vol?: number; hasta?: number; en?: number; a?: AudioNode; ataque?: number } = {}): void {
  const c = ctx;
  if (!c) return;
  const t = c.currentTime + (o.en ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.tipo ?? 'square';
  osc.frequency.setValueAtTime(f, t);
  if (o.hasta) osc.frequency.exponentialRampToValueAtTime(o.hasta, t + dur);
  const v = o.vol ?? 0.3;
  const at = o.ataque ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + at);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(o.a ?? bus.efectos);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Ráfaga de ruido filtrado (golpes, agua, chispas, platillos). */
function ruido(dur: number, o: { vol?: number; filtro?: BiquadFilterType; f?: number; q?: number; en?: number; a?: AudioNode; ataque?: number } = {}): void {
  const c = ctx;
  if (!c) return;
  const t = c.currentTime + (o.en ?? 0);
  const src = c.createBufferSource();
  src.buffer = ruidoBuf;
  src.loop = true;
  const fil = c.createBiquadFilter();
  fil.type = o.filtro ?? 'lowpass';
  fil.frequency.value = o.f ?? 1200;
  fil.Q.value = o.q ?? 0.7;
  const g = c.createGain();
  const v = o.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (o.ataque ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fil).connect(g).connect(o.a ?? bus.efectos);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const arpegio = (notas: number[], paso: number, dur: number, vol = 0.22, tipo: OscillatorType = 'square') =>
  notas.forEach((n, i) => tono(hz(n), dur, { en: i * paso, vol, tipo }));

/** Recetas de los efectos. */
const RECETAS: Record<Efecto, () => void> = {
  toque: () => tono(660, 0.05, { vol: 0.12 }),
  abrir: () => tono(440, 0.09, { hasta: 700, vol: 0.12, tipo: 'triangle' }),
  cerrar: () => tono(600, 0.09, { hasta: 380, vol: 0.12, tipo: 'triangle' }),
  moneda: () => { tono(988, 0.06, { vol: 0.16 }); tono(1319, 0.16, { en: 0.06, vol: 0.16 }); },
  aporte: () => [0, 0.08, 0.16].forEach((en, i) => { tono(988 + i * 120, 0.05, { en, vol: 0.13 }); tono(1319 + i * 160, 0.12, { en: en + 0.05, vol: 0.13 }); }),
  acierto: () => { tono(784, 0.07, { vol: 0.16, tipo: 'triangle' }); tono(1047, 0.12, { en: 0.06, vol: 0.18, tipo: 'triangle' }); },
  error: () => tono(200, 0.22, { hasta: 120, vol: 0.14, tipo: 'sawtooth' }),
  combo: () => arpegio([72, 76, 79, 84], 0.05, 0.09, 0.14),
  record: () => { arpegio([72, 76, 79, 84, 88], 0.08, 0.14, 0.15); tono(hz(91), 0.5, { en: 0.42, vol: 0.12, tipo: 'triangle' }); },
  meta: () => {
    arpegio([60, 64, 67, 72], 0.12, 0.2, 0.16);
    [72, 76, 79].forEach((n) => tono(hz(n), 1.1, { en: 0.5, vol: 0.1, tipo: 'triangle', ataque: 0.03 }));
    ruido(0.9, { en: 0.5, vol: 0.05, filtro: 'highpass', f: 6000 });
  },
  golpe: () => { ruido(0.16, { vol: 0.45, f: 700 }); tono(140, 0.18, { hasta: 50, vol: 0.4, tipo: 'sine' }); },
  salto: () => tono(320, 0.13, { hasta: 760, vol: 0.12 }),
  tic: () => tono(1250, 0.035, { vol: 0.12, tipo: 'sine' }),
  aviso: () => { tono(880, 0.08, { vol: 0.1 }); tono(660, 0.1, { en: 0.1, vol: 0.1 }); },
  fin: () => arpegio([67, 72, 76, 79], 0.1, 0.22, 0.14, 'triangle'),
  agua: () => { ruido(1.6, { vol: 0.12, filtro: 'bandpass', f: 1800, q: 0.6, ataque: 0.3 }); ruido(1.4, { en: 0.2, vol: 0.06, filtro: 'highpass', f: 4000, ataque: 0.3 }); },
  golpesPuerta: () => [0, 0.32, 0.64].forEach((en) => { ruido(0.09, { en, vol: 0.5, f: 380 }); tono(95, 0.12, { en, vol: 0.35, tipo: 'sine', hasta: 70 }); }),
  puerta: () => tono(180, 0.45, { hasta: 320, vol: 0.06, tipo: 'sawtooth', ataque: 0.05 }),
  comer: () => [0, 0.12, 0.24].forEach((en) => ruido(0.06, { en, vol: 0.22, filtro: 'highpass', f: 2200 })),
  pop: () => tono(520, 0.07, { hasta: 980, vol: 0.14, tipo: 'sine' }),
  giro: () => tono(420, 0.05, { hasta: 560, vol: 0.1, tipo: 'triangle' }),
  chispa: () => { ruido(0.08, { vol: 0.18, filtro: 'highpass', f: 3500 }); tono(2100, 0.05, { vol: 0.05 }); },
  caer: () => tono(520, 0.22, { hasta: 180, vol: 0.1, tipo: 'triangle' }),
  tecla: () => tono(1400 + Math.random() * 200, 0.018, { vol: 0.035 }),
  festejo: () => { arpegio([67, 72, 76, 79, 84], 0.06, 0.12, 0.13); ruido(0.5, { en: 0.25, vol: 0.05, filtro: 'highpass', f: 7000 }); },
};

/** Para que una ráfaga de aciertos no sature: cada efecto suena como mucho cada 35 ms. */
const ultimo: Partial<Record<Efecto, number>> = {};

export function sonar(e: Efecto): void {
  const c = ctx;
  if (!c || c.state !== 'running' || !preferencias().efectos) return;
  const ahora = performance.now();
  if ((ultimo[e] ?? 0) > ahora - 35) return;
  ultimo[e] = ahora;
  RECETAS[e]();
}

/**
 * «Voz» de Rupert mientras aparece su globo: un murmullo de sílabas cortas, más grave si está triste.
 * Como en los juegos de antes, no dice nada, pero se entiende el tono.
 */
export function voz(texto: string, triste = false): void {
  const c = ctx;
  if (!c || c.state !== 'running' || !preferencias().efectos) return;
  const silabas = Math.min(14, Math.max(3, Math.round(texto.length / 9)));
  const base = triste ? 150 : 210;
  const pregunta = texto.trim().endsWith('?');
  for (let i = 0; i < silabas; i++) {
    const sube = pregunta && i >= silabas - 2 ? 1.25 : 1;
    const f = base * (0.85 + Math.random() * 0.35) * sube;
    tono(f, 0.07, { en: i * 0.085, vol: 0.06, tipo: 'square', hasta: f * (0.92 + Math.random() * 0.1) });
  }
}

// ——— Música ———

interface DefTema {
  bpm: number;
  /** Corcheas por compás (8 = 4/4, 6 = 3/4). */
  pasos: number;
  /** Acordes: raíz MIDI y tipo, uno por compás. */
  acordes: [number, 'M' | 'm' | '7'][];
  semilla: number;
  bateria: boolean;
  /** Qué tan seguido suena la melodía (0 a 1). */
  densidad: number;
  melodia: OscillatorType;
}

const TEMAS: Record<Tema, DefTema> = {
  callejon: { bpm: 84, pasos: 8, acordes: [[57, 'm'], [62, 'm'], [57, 'm'], [64, '7'], [57, 'm'], [62, 'm'], [64, '7'], [57, 'm']], semilla: 3, bateria: false, densidad: 0.45, melodia: 'triangle' },
  plaza: { bpm: 132, pasos: 6, acordes: [[60, 'M'], [65, 'M'], [67, '7'], [60, 'M'], [57, 'm'], [62, 'm'], [67, '7'], [60, 'M']], semilla: 11, bateria: false, densidad: 0.55, melodia: 'square' },
  ciudad: { bpm: 116, pasos: 8, acordes: [[65, 'M'], [62, 'm'], [70, 'M'], [72, '7'], [65, 'M'], [62, 'm'], [70, 'M'], [72, '7']], semilla: 5, bateria: true, densidad: 0.6, melodia: 'square' },
  interior: { bpm: 92, pasos: 8, acordes: [[67, 'M'], [64, 'm'], [60, 'M'], [62, '7'], [67, 'M'], [64, 'm'], [60, 'M'], [62, '7']], semilla: 8, bateria: false, densidad: 0.4, melodia: 'triangle' },
  changa: { bpm: 140, pasos: 8, acordes: [[64, 'm'], [60, 'M'], [62, 'M'], [59, '7'], [64, 'm'], [60, 'M'], [62, 'M'], [59, '7']], semilla: 21, bateria: true, densidad: 0.7, melodia: 'square' },
  titulo: { bpm: 100, pasos: 8, acordes: [[60, 'M'], [67, 'M'], [57, 'm'], [65, 'M'], [60, 'M'], [67, 'M'], [65, 'M'], [67, '7']], semilla: 2, bateria: false, densidad: 0.5, melodia: 'triangle' },
  epilogo: { bpm: 70, pasos: 6, acordes: [[60, 'M'], [64, 'm'], [65, 'M'], [67, '7'], [60, 'M'], [57, 'm'], [65, 'M'], [67, 'M']], semilla: 13, bateria: false, densidad: 0.35, melodia: 'triangle' },
};

const INTERVALOS = { M: [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10] };

/** Melodía fija de cada tema: una nota del acorde (o silencio) por corchea, con una semilla. */
function componer(t: DefTema): (number | null)[][] {
  let s = t.semilla * 9301 + 49297;
  const azar = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let previa = 0;
  return t.acordes.map(([raiz, tipo]) => {
    const tonos = INTERVALOS[tipo].map((i) => raiz + 12 + i);
    return Array.from({ length: t.pasos }, (_, k) => {
      const fuerte = k % (t.pasos === 6 ? 3 : 2) === 0;
      if (azar() > t.densidad + (fuerte ? 0.25 : 0)) return null;
      // Paso cercano a la nota anterior, para que la melodía camine y no salte.
      const cerca = tonos.slice().sort((a, b) => Math.abs(a - previa) - Math.abs(b - previa));
      const n = azar() < 0.7 && previa ? cerca[Math.floor(azar() * 2)] : tonos[Math.floor(azar() * tonos.length)];
      previa = n;
      return n;
    });
  });
}

let sonando: { tema: Tema; def: DefTema; melodia: (number | null)[][]; paso: number; proximo: number; reloj: number } | null = null;

/** Cambia el tema de música (null: silencio). Si ya suena ese tema, sigue sin cortarse. */
export function musica(tema: Tema | null): void {
  if (sonando?.tema === tema) return;
  if (sonando) {
    clearInterval(sonando.reloj);
    sonando = null;
  }
  if (!tema) return;
  const c = contexto();
  if (!c) return;
  const def = TEMAS[tema];
  const s = { tema, def, melodia: componer(def), paso: 0, proximo: c.currentTime + 0.15, reloj: 0 };
  s.reloj = window.setInterval(() => programar(s), 30);
  sonando = s;
}

/** Agenda las corcheas de los próximos 150 ms (así no se atrasa aunque el juego se trabe un instante). */
function programar(s: NonNullable<typeof sonando>): void {
  const c = ctx;
  if (!c || c.state !== 'running') {
    if (c) s.proximo = c.currentTime + 0.1;
    return;
  }
  const corchea = 30 / s.def.bpm;
  const a = bus.musica;
  while (s.proximo < c.currentTime + 0.15) {
    const total = s.def.pasos * s.def.acordes.length;
    const compas = Math.floor((s.paso % total) / s.def.pasos);
    const k = s.paso % s.def.pasos;
    const [raiz, tipo] = s.def.acordes[compas];
    const en = s.proximo - c.currentTime;
    // Bajo: raíz en el primer tiempo, quinta en el medio.
    const vals = s.def.pasos === 6 ? 3 : 4;
    if (k === 0) tono(hz(raiz - 24), corchea * 2.6, { en, a, vol: 0.5, tipo: 'triangle' });
    else if (k === vals) tono(hz(raiz - 17), corchea * 2.2, { en, a, vol: 0.4, tipo: 'triangle' });
    // Acompañamiento: el acorde en los contratiempos (en 3/4, «um-pa-pa»).
    if ((s.def.pasos === 6 && (k === 2 || k === 4)) || (s.def.pasos === 8 && k % 2 === 1)) {
      for (const i of INTERVALOS[tipo].slice(0, 3)) tono(hz(raiz + i), corchea * 0.8, { en, a, vol: 0.06, tipo: 'square' });
    }
    const n = s.melodia[compas][k];
    if (n !== null) tono(hz(n), corchea * 1.6, { en, a, vol: 0.22, tipo: s.def.melodia });
    if (s.def.bateria) {
      if (k % 4 === 0) tono(110, 0.12, { en, a, vol: 0.5, tipo: 'sine', hasta: 45 });
      if (k % 2 === 1) ruido(0.04, { en, a, vol: 0.12, filtro: 'highpass', f: 7000 });
      if (k === 4) ruido(0.12, { en, a, vol: 0.18, filtro: 'bandpass', f: 1800 });
    }
    s.proximo += corchea;
    s.paso += 1;
  }
}
