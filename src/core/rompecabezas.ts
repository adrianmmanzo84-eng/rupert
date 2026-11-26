/**
 * Reglas puras de tres changas nuevas (R026): Plomería (girar caños), Electricidad (unir cables) y
 * Reponer el almacén (tres en línea). Sin Phaser; las escenas dibujan y las pruebas verifican.
 */

type Azar = () => number;
const entero = (azar: Azar, n: number) => Math.floor(azar() * n);

// ——— Plomería: girar caños para que el agua llegue de la canilla al desagüe ———

/** Aberturas de un caño como bits: norte 1, este 2, sur 4, oeste 8. */
export const N = 1;
export const ES = 2;
export const S = 4;
export const O = 8;
const DIRS = [
  { bit: N, dx: 0, dy: -1, opuesto: S },
  { bit: ES, dx: 1, dy: 0, opuesto: O },
  { bit: S, dx: 0, dy: 1, opuesto: N },
  { bit: O, dx: -1, dy: 0, opuesto: ES },
];

/** Gira las aberturas 90° en sentido horario `veces` veces. */
export function girar(aberturas: number, veces = 1): number {
  let a = aberturas;
  for (let i = 0; i < ((veces % 4) + 4) % 4; i++) a = ((a << 1) | (a >> 3)) & 15;
  return a;
}

export interface Canerias {
  cols: number;
  filas: number;
  /** Aberturas de cada casilla (fila por fila), ya giradas como las ve el jugador. */
  celdas: number[];
  /** Fila de la canilla (entra por el borde izquierdo) y del desagüe (sale por el borde derecho). */
  entrada: number;
  salida: number;
}

/** Tamaño del nivel: crece con los niveles resueltos. */
export function tamanoCanerias(nivel: number): { cols: number; filas: number } {
  const t = [
    [4, 3],
    [5, 4],
    [6, 4],
    [6, 5],
    [7, 5],
  ][Math.min(4, nivel)];
  return { cols: t[0], filas: t[1] };
}

/**
 * Nivel con solución garantizada: un camino al azar de la canilla al desagüe define los caños necesarios;
 * el resto se llena con caños al azar y después se giran todos al azar (sin dejarlo resuelto).
 */
export function nivelCanerias(nivel: number, azar: Azar = Math.random): Canerias {
  const { cols, filas } = tamanoCanerias(nivel);
  for (;;) {
    const entrada = entero(azar, filas);
    const salida = entero(azar, filas);
    const camino = caminoAlAzar(cols, filas, entrada, salida, azar);
    if (!camino) continue;
    const celdas = new Array<number>(cols * filas).fill(0);
    camino.forEach((c, i) => {
      const prev = i === 0 ? { x: -1, y: entrada } : camino[i - 1];
      const next = i === camino.length - 1 ? { x: cols, y: salida } : camino[i + 1];
      let a = 0;
      for (const v of [prev, next]) {
        const d = DIRS.find((dd) => dd.dx === v.x - c.x && dd.dy === v.y - c.y)!;
        a |= d.bit;
      }
      celdas[c.y * cols + c.x] = a;
    });
    const relleno = [N | S, N | ES, N | ES | S];
    for (let i = 0; i < celdas.length; i++) if (!celdas[i]) celdas[i] = girar(relleno[entero(azar, 3)], entero(azar, 4));
    const t: Canerias = { cols, filas, celdas: celdas.map((a) => girar(a, entero(azar, 4))), entrada, salida };
    if (!aguaLlega(t).llega) return t;
  }
}

/** Camino simple (sin repetir casillas) de (0, entrada) a (cols−1, salida), con algunas vueltas. */
function caminoAlAzar(cols: number, filas: number, entrada: number, salida: number, azar: Azar): { x: number; y: number }[] | null {
  const visto = new Set<number>();
  const camino: { x: number; y: number }[] = [];
  const buscar = (x: number, y: number, pasos: number): boolean => {
    if (pasos > cols * filas * 4) return false;
    camino.push({ x, y });
    visto.add(y * cols + x);
    if (x === cols - 1 && y === salida) return true;
    const opciones = DIRS.map((d) => ({ x: x + d.dx, y: y + d.dy }))
      .filter((p) => p.x >= 0 && p.x < cols && p.y >= 0 && p.y < filas && !visto.has(p.y * cols + p.x));
    // Mezcla, con preferencia suave por avanzar hacia la derecha.
    opciones.sort(() => azar() - 0.5);
    opciones.sort((a, b) => (b.x - a.x) * (azar() < 0.55 ? 1 : 0));
    for (const p of opciones) if (buscar(p.x, p.y, pasos + 1)) return true;
    camino.pop();
    visto.delete(y * cols + x);
    return false;
  };
  return buscar(0, entrada, 0) ? camino : null;
}

/** Hasta dónde llega el agua desde la canilla y si sale por el desagüe. */
export function aguaLlega(t: Canerias): { llega: boolean; mojadas: Set<number> } {
  const mojadas = new Set<number>();
  const inicio = t.entrada * t.cols;
  if (!(t.celdas[inicio] & O)) return { llega: false, mojadas };
  const cola = [inicio];
  mojadas.add(inicio);
  let llega = false;
  while (cola.length) {
    const i = cola.shift()!;
    const x = i % t.cols;
    const y = Math.floor(i / t.cols);
    if (x === t.cols - 1 && y === t.salida && t.celdas[i] & ES) llega = true;
    for (const d of DIRS) {
      if (!(t.celdas[i] & d.bit)) continue;
      const nx = x + d.dx;
      const ny = y + d.dy;
      if (nx < 0 || nx >= t.cols || ny < 0 || ny >= t.filas) continue;
      const j = ny * t.cols + nx;
      if (!mojadas.has(j) && t.celdas[j] & d.opuesto) {
        mojadas.add(j);
        cola.push(j);
      }
    }
  }
  return { llega, mojadas };
}

export function puntosCanerias(nivel: number, segundos: number): number {
  const { cols, filas } = tamanoCanerias(nivel);
  return cols * filas + (segundos <= 10 ? 6 : segundos <= 20 ? 3 : 0);
}

// ——— Electricidad: unir cada enchufe con su foco sin cruzar cables ———

export interface Cables {
  cols: number;
  filas: number;
  /** Pares a unir: de un enchufe a un foco, cada uno con su color (índice). */
  pares: { a: number; b: number }[];
}

export function tamanoCables(nivel: number): { cols: number; filas: number; pares: number } {
  const t = [
    [5, 5, 3],
    [6, 5, 4],
    [6, 6, 4],
    [7, 6, 5],
    [7, 6, 6],
  ][Math.min(4, nivel)];
  return { cols: t[0], filas: t[1], pares: t[2] };
}

/**
 * Nivel con solución: se trazan cables al azar que no se cruzan (cada uno de 3 a 9 casillas) y se dejan solo
 * sus puntas. El jugador puede resolverlo por esos caminos o por otros.
 */
export function nivelCables(nivel: number, azar: Azar = Math.random): Cables {
  const { cols, filas, pares } = tamanoCables(nivel);
  for (let intento = 0; intento < 500; intento++) {
    const ocupado = new Set<number>();
    const res: { a: number; b: number }[] = [];
    for (let p = 0; p < pares; p++) {
      const libres = [...Array(cols * filas).keys()].filter((i) => !ocupado.has(i));
      if (!libres.length) break;
      let i = libres[entero(azar, libres.length)];
      const camino = [i];
      const largo = 3 + entero(azar, 7);
      while (camino.length < largo) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        const vec = DIRS.map((d) => ({ x: x + d.dx, y: y + d.dy }))
          .filter((q) => q.x >= 0 && q.x < cols && q.y >= 0 && q.y < filas)
          .map((q) => q.y * cols + q.x)
          .filter((j) => !ocupado.has(j) && !camino.includes(j));
        if (!vec.length) break;
        i = vec[entero(azar, vec.length)];
        camino.push(i);
      }
      if (camino.length < 3) break;
      camino.forEach((c) => ocupado.add(c));
      res.push({ a: camino[0], b: camino[camino.length - 1] });
    }
    if (res.length === pares) return { cols, filas, pares: res };
  }
  throw new Error('no se pudo armar el nivel de cables');
}

/** ¿Dos casillas son vecinas (arriba, abajo, izquierda o derecha)? */
export function vecinas(cols: number, i: number, j: number): boolean {
  const dx = Math.abs((i % cols) - (j % cols));
  const dy = Math.abs(Math.floor(i / cols) - Math.floor(j / cols));
  return dx + dy === 1;
}

/** Un cable está completo si une las dos puntas de su par con casillas vecinas seguidas. */
export function cableCompleto(c: Cables, par: number, camino: number[]): boolean {
  const { a, b } = c.pares[par];
  if (camino.length < 2) return false;
  const extremos = [camino[0], camino[camino.length - 1]];
  if (!(extremos.includes(a) && extremos.includes(b))) return false;
  return camino.every((x, k) => k === 0 || vecinas(c.cols, camino[k - 1], x));
}

export function puntosCables(nivel: number): number {
  const { pares } = tamanoCables(nivel);
  return pares * 4 + 2;
}

// ——— Reponer el almacén: tres en línea ———

export const PRODUCTOS_ALMACEN = ['sandwich', 'sopa', 'cafe', 'manzana', 'jabon', 'toalla'] as const;

export interface Tablero {
  cols: number;
  filas: number;
  /** Tipo de cada casilla (índice en PRODUCTOS_ALMACEN), fila por fila; −1 = vacía. */
  celdas: number[];
}

/** Tablero lleno sin líneas hechas y con al menos un movimiento posible. */
export function tableroNuevo(cols: number, filas: number, tipos: number, azar: Azar = Math.random): Tablero {
  for (;;) {
    const t: Tablero = { cols, filas, celdas: new Array(cols * filas).fill(-1) };
    for (let i = 0; i < t.celdas.length; i++) {
      const x = i % cols;
      const y = Math.floor(i / cols);
      let v: number;
      do v = entero(azar, tipos);
      while ((x >= 2 && t.celdas[i - 1] === v && t.celdas[i - 2] === v) || (y >= 2 && t.celdas[i - cols] === v && t.celdas[i - 2 * cols] === v));
      t.celdas[i] = v;
    }
    if (hayMovimiento(t)) return t;
  }
}

/** Grupos de 3 o más iguales en fila o columna. */
export function lineas(t: Tablero): { celdas: number[]; largo: number; horizontal: boolean }[] {
  const res: { celdas: number[]; largo: number; horizontal: boolean }[] = [];
  const recorrer = (horizontal: boolean) => {
    const A = horizontal ? t.filas : t.cols;
    const B = horizontal ? t.cols : t.filas;
    for (let a = 0; a < A; a++) {
      let inicio = 0;
      for (let b = 1; b <= B; b++) {
        const idx = (k: number) => (horizontal ? a * t.cols + k : k * t.cols + a);
        const igual = b < B && t.celdas[idx(b)] !== -1 && t.celdas[idx(b)] === t.celdas[idx(inicio)];
        if (!igual) {
          if (b - inicio >= 3 && t.celdas[idx(inicio)] !== -1) {
            res.push({ celdas: Array.from({ length: b - inicio }, (_, k) => idx(inicio + k)), largo: b - inicio, horizontal });
          }
          inicio = b;
        }
      }
    }
  };
  recorrer(true);
  recorrer(false);
  return res;
}

export function intercambiar(t: Tablero, i: number, j: number): void {
  [t.celdas[i], t.celdas[j]] = [t.celdas[j], t.celdas[i]];
}

/** ¿Intercambiar estas dos casillas vecinas arma alguna línea? */
export function movidaValida(t: Tablero, i: number, j: number): boolean {
  if (!vecinas(t.cols, i, j)) return false;
  intercambiar(t, i, j);
  const ok = lineas(t).length > 0;
  intercambiar(t, i, j);
  return ok;
}

export function hayMovimiento(t: Tablero): boolean {
  for (let i = 0; i < t.celdas.length; i++) {
    if (i % t.cols < t.cols - 1 && movidaValida(t, i, i + 1)) return true;
    if (i + t.cols < t.celdas.length && movidaValida(t, i, i + t.cols)) return true;
  }
  return false;
}

/**
 * Casillas que se vacían por estas líneas. Una línea de 4 vacía además toda su fila (o columna);
 * una de 5 o más vacía todos los productos de ese tipo.
 */
export function aVaciar(t: Tablero, ls: ReturnType<typeof lineas>): Set<number> {
  const fuera = new Set<number>();
  for (const l of ls) {
    l.celdas.forEach((c) => fuera.add(c));
    if (l.largo >= 5) {
      const tipo = t.celdas[l.celdas[0]];
      t.celdas.forEach((v, i) => v === tipo && fuera.add(i));
    } else if (l.largo === 4) {
      const c0 = l.celdas[0];
      if (l.horizontal) {
        const y = Math.floor(c0 / t.cols);
        for (let x = 0; x < t.cols; x++) fuera.add(y * t.cols + x);
      } else {
        const x = c0 % t.cols;
        for (let y = 0; y < t.filas; y++) fuera.add(y * t.cols + x);
      }
    }
  }
  return fuera;
}

/**
 * Hace caer los productos sobre los huecos y rellena desde arriba. Devuelve, por cada casilla final,
 * de qué fila vino (negativa si es nueva), para animar la caída.
 */
export function caer(t: Tablero, tipos: number, azar: Azar = Math.random): number[] {
  const desde = new Array(t.celdas.length).fill(0);
  for (let x = 0; x < t.cols; x++) {
    let escribir = t.filas - 1;
    for (let y = t.filas - 1; y >= 0; y--) {
      const v = t.celdas[y * t.cols + x];
      if (v !== -1) {
        t.celdas[escribir * t.cols + x] = v;
        desde[escribir * t.cols + x] = y;
        escribir -= 1;
      }
    }
    let nuevo = -1;
    for (let y = escribir; y >= 0; y--) {
      t.celdas[y * t.cols + x] = entero(azar, tipos);
      desde[y * t.cols + x] = nuevo;
      nuevo -= 1;
    }
  }
  return desde;
}

/** Puntos por casilla vaciada: más en cada cascada seguida de la misma jugada. */
export function puntosTres(vaciadas: number, cascada: number): number {
  return vaciadas * (1 + cascada);
}
