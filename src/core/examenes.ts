/**
 * Exámenes de ingenio (instituto, etapas 7 a 9): acertijos de cuentas, series, porcentajes y problemas
 * cotidianos de plata, con cuatro respuestas. Se generan al azar y se ponen más difíciles con cada acierto.
 * Datos y reglas puras, sin Phaser.
 */

export interface Acertijo {
  pregunta: string;
  opciones: number[];
  correcta: number;
  /** Unidad que se muestra junto a cada opción (vacía para números sueltos). */
  unidad: string;
}

type Azar = () => number;

const entre = (azar: Azar, a: number, b: number) => a + Math.floor(azar() * (b - a + 1));
const elegir = <T>(azar: Azar, xs: readonly T[]): T => xs[Math.floor(azar() * xs.length)];

/** Tres respuestas equivocadas pero creíbles, distintas entre sí y de la correcta, todas positivas. */
export function distractores(correcta: number, azar: Azar, paso = 1): number[] {
  const cerca = [1, 2, 3, 5, 10].map((d) => d * paso);
  const fuera = new Set<number>([correcta]);
  const res: number[] = [];
  let intentos = 0;
  while (res.length < 3 && intentos < 100) {
    intentos += 1;
    const d = elegir(azar, cerca) * (azar() < 0.5 ? -1 : 1);
    const v = correcta + d;
    if (v > 0 && !fuera.has(v)) {
      fuera.add(v);
      res.push(v);
    }
  }
  for (let v = correcta + paso; res.length < 3; v += paso) if (!fuera.has(v)) { fuera.add(v); res.push(v); }
  return res;
}

function armar(pregunta: string, correcta: number, azar: Azar, unidad = '', paso = 1): Acertijo {
  const opciones = [correcta, ...distractores(correcta, azar, paso)];
  for (let i = opciones.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
  }
  return { pregunta, opciones, correcta, unidad };
}

function cuenta(n: number, azar: Azar): Acertijo {
  const tipo = elegir(azar, n < 2 ? ['+', '-'] : ['+', '-', '×', '×']);
  if (tipo === '×') {
    const a = entre(azar, 3, 6 + n * 2);
    const b = entre(azar, 3, 9 + n);
    return armar(`${a} × ${b} = ?`, a * b, azar, '', a > 9 ? 2 : 1);
  }
  const max = 20 + n * 30;
  const a = entre(azar, 10, max);
  let b = entre(azar, 5, max);
  if (b === a) b += entre(azar, 3, 9);
  if (tipo === '-') return armar(`${Math.max(a, b)} − ${Math.min(a, b)} = ?`, Math.abs(a - b), azar);
  return armar(`${a} + ${b} = ?`, a + b, azar);
}

function serie(n: number, azar: Azar): Acertijo {
  if (n >= 3 && azar() < 0.4) {
    const r = entre(azar, 2, 3);
    const a = entre(azar, 1, 5);
    const xs = [0, 1, 2, 3].map((i) => a * r ** i);
    return armar(`¿Qué sigue? ${xs.join(', ')}, ...`, a * r ** 4, azar, '', a);
  }
  const d = entre(azar, 2, 4 + n * 2) * (n >= 4 && azar() < 0.3 ? -1 : 1);
  const a = d < 0 ? entre(azar, -d * 5, -d * 5 + 40) : entre(azar, 1, 20);
  const xs = [0, 1, 2, 3].map((i) => a + d * i);
  return armar(`¿Qué sigue? ${xs.join(', ')}, ...`, a + d * 4, azar);
}

function porcentaje(n: number, azar: Azar): Acertijo {
  const p = elegir(azar, n < 3 ? [10, 50, 25] : [10, 20, 25, 50, 75, 15]);
  const base = entre(azar, 2, 8 + n * 2) * (p === 15 || p === 25 || p === 75 ? 20 : 10);
  return armar(`¿Cuánto es el ${p}% de ${base}?`, (base * p) / 100, azar, '', p === 10 ? 1 : 5);
}

function plata(n: number, azar: Azar): Acertijo {
  const tipo = entre(azar, 0, 2);
  if (tipo === 0) {
    const precio = entre(azar, 2, 6 + n) * 5;
    const k = entre(azar, 2, 4);
    const m = entre(azar, k + 1, k + 4);
    return armar(`Si ${k} cafés cuestan ${k * precio} monedas, ¿cuánto cuestan ${m}?`, m * precio, azar, ' mon.', 5);
  }
  if (tipo === 1) {
    const porDia = entre(azar, 2, 5 + n) * 5;
    const dias = entre(azar, 3, 6 + n);
    return armar(`Ahorras ${porDia} monedas por día. ¿Cuántos días necesitas para juntar ${porDia * dias}?`, dias, azar, ' días');
  }
  const pago = entre(azar, 2, 5) * 50;
  const gasto = entre(azar, 3, pago / 5 - 1) * 5;
  return armar(`Pagas con ${pago} algo que cuesta ${gasto}. ¿Cuánto vuelto te dan?`, pago - gasto, azar, ' mon.', 5);
}

/** Nivel según los aciertos de esta partida y la etapa (el instituto empieza en la 7). */
export function nivelExamen(aciertos: number, etapa: number): number {
  return Math.min(6, Math.floor(aciertos / 3) + Math.max(0, etapa - 7));
}

export function acertijo(nivel: number, azar: Azar = Math.random): Acertijo {
  const tipos = [cuenta, serie, porcentaje, plata];
  return elegir(azar, tipos)(nivel, azar);
}

/** Puntos por respuesta: los aciertos seguidos valen más; un error descuenta poco. */
export function puntosExamen(acierto: boolean, racha: number): number {
  return acierto ? 4 + Math.min(4, racha) : -2;
}
