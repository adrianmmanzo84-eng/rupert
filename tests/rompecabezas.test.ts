import { describe, expect, it } from 'vitest';
import {
  ES,
  N,
  O,
  S,
  ESP,
  buscarMovimiento,
  intercambiar,
  movidaValida,
  paso,
  aguaLlega,
  cableCompleto,
  caer,
  girar,
  hayMovimiento,
  lineas,
  nivelCables,
  nivelCanerias,
  tableroNuevo,
  tamanoCables,
} from '../src/core/rompecabezas';
import { multiplicadorCombo, ritmoDeEtapa } from '../src/core/minijuegos';

function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** ¿Hay forma de girar los caños para que el agua llegue? Sigue el agua desde la canilla probando giros. */
function resolubleCanerias(nivel: number, azar: () => number): boolean {
  const t = nivelCanerias(nivel, azar);
  const DIRS = [
    { bit: N, dx: 0, dy: -1, op: S },
    { bit: ES, dx: 1, dy: 0, op: O },
    { bit: S, dx: 0, dy: 1, op: N },
    { bit: O, dx: -1, dy: 0, op: ES },
  ];
  const visto = new Set<number>();
  const seguir = (x: number, y: number, entra: number): boolean => {
    if (x < 0 || y < 0 || x >= t.cols || y >= t.filas) return false;
    const i = y * t.cols + x;
    if (visto.has(i)) return false;
    visto.add(i);
    for (let r = 0; r < 4; r++) {
      const a = girar(t.celdas[i], r);
      if (!(a & entra)) continue;
      for (const d of DIRS) {
        if (d.bit === entra || !(a & d.bit)) continue;
        if (x === t.cols - 1 && y === t.salida && d.bit === ES) return true;
        if (seguir(x + d.dx, y + d.dy, d.op)) return true;
      }
    }
    visto.delete(i);
    return false;
  };
  return seguir(0, t.entrada, O);
}

describe('plomería', () => {
  it('girar 4 veces vuelve al caño original; una recta gira de N-S a E-O', () => {
    expect(girar(N | S)).toBe(ES | O);
    expect(girar(N | ES, 4)).toBe(N | ES);
    expect(girar(N | ES)).toBe(ES | S);
  });

  it('los niveles empiezan sin resolver y tienen solución', () => {
    const azar = semilla(11);
    for (let i = 0; i < 20; i++) {
      const t = nivelCanerias(0, azar);
      expect(aguaLlega(t).llega).toBe(false);
    }
    for (let nivel = 0; nivel < 5; nivel++) for (let k = 0; k < 4; k++) expect(resolubleCanerias(nivel, semilla(nivel * 10 + k + 1))).toBe(true);
  });

  it('el agua llega por un caño recto de punta a punta', () => {
    const t = { cols: 3, filas: 1, celdas: [ES | O, ES | O, ES | O], entrada: 0, salida: 0 };
    expect(aguaLlega(t).llega).toBe(true);
    t.celdas[1] = N | S;
    expect(aguaLlega(t).llega).toBe(false);
  });
});

describe('electricidad', () => {
  it('cada nivel tiene sus pares en casillas distintas', () => {
    for (let nivel = 0; nivel < 6; nivel++) {
      const c = nivelCables(nivel, semilla(nivel + 3));
      const puntas = c.pares.flatMap((p) => [p.a, p.b]);
      expect(new Set(puntas).size).toBe(puntas.length);
      expect(c.pares).toHaveLength(tamanoCables(nivel).pares);
    }
  });

  it('un cable completo une sus dos puntas con casillas vecinas', () => {
    const c = { cols: 3, filas: 3, pares: [{ a: 0, b: 2 }] };
    expect(cableCompleto(c, 0, [0, 1, 2])).toBe(true);
    expect(cableCompleto(c, 0, [2, 1, 0])).toBe(true);
    expect(cableCompleto(c, 0, [0, 4, 2])).toBe(false);
    expect(cableCompleto(c, 0, [0, 1])).toBe(false);
  });
});

describe('tres en línea', () => {
  it('el tablero nuevo no trae líneas hechas y tiene jugadas', () => {
    for (let i = 0; i < 30; i++) {
      const t = tableroNuevo(8, 6, 6, semilla(i + 5));
      expect(lineas(t)).toEqual([]);
      expect(hayMovimiento(t)).toBe(true);
    }
  });

  it('una línea de 4 deja un especial de fila y una de 5 una estrella', () => {
    const t = { cols: 5, filas: 2, celdas: [0, 0, 0, 0, 1, 2, 3, 0, 2, 3] };
    const p = paso(t, [3, 8])!;
    expect([...p.fuera].sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(p.nuevas).toEqual([{ i: 3, esp: ESP.fila, tipo: 0 }]);
    const v = { cols: 3, filas: 5, celdas: [0, 1, 2, 0, 1, 2, 0, 2, 1, 0, 1, 2, 3, 1, 2] };
    expect(paso(v)!.nuevas[0].esp).toBe(ESP.columna);
    const u = { cols: 5, filas: 2, celdas: [1, 1, 1, 1, 1, 2, 3, 2, 3, 2] };
    expect(paso(u)!.nuevas[0].esp).toBe(ESP.estrella);
  });

  it('dos líneas cruzadas dejan una bomba', () => {
    const t = { cols: 5, filas: 5, celdas: [
      1, 2, 0, 3, 4,
      2, 3, 0, 1, 2,
      0, 0, 0, 4, 1,
      3, 1, 0, 2, 3,
      4, 2, 1, 3, 1,
    ] };
    const p = paso(t)!;
    expect(p.nuevas).toEqual([{ i: 12, esp: ESP.bomba, tipo: 0 }]);
    expect(p.fuera.has(12)).toBe(false);
    expect(p.fuera.size).toBe(5);
  });

  it('un especial dentro de una línea explota y arrastra a los demás', () => {
    // Fila especial en la fila 1: se vacía toda; la bomba que estaba allí también explota.
    const t = { cols: 5, filas: 3, celdas: [2, 3, 4, 2, 3, 1, 1, 1, 0, 2, 3, 4, 2, 4, 3], esp: [0, 0, 0, 0, 0, 0, ESP.fila, 0, 0, 0, 0, 0, 0, 0, 0] };
    const p = paso(t)!;
    for (let x = 0; x < 5; x++) expect(p.fuera.has(5 + x)).toBe(true);
    expect(p.activadas.map((a) => a.esp)).toEqual([ESP.fila]);
    const u = { cols: 5, filas: 3, celdas: [2, 3, 4, 2, 3, 1, 1, 1, 0, 2, 3, 4, 2, 4, 3], esp: [0, 0, 0, 0, 0, 0, ESP.fila, 0, 0, ESP.bomba, 0, 0, 0, 0, 0] };
    const q = paso(u)!;
    expect(q.activadas.map((a) => a.esp).sort()).toEqual([ESP.fila, ESP.bomba]);
    expect(q.fuera.has(14)).toBe(true); // alcanzada por la bomba de la casilla 9
  });

  it('mover una estrella vacía el producto de su vecino, aunque no arme línea', () => {
    const t = { cols: 4, filas: 2, celdas: [0, 1, 0, 2, 1, 2, 1, 0], esp: [ESP.estrella, 0, 0, 0, 0, 0, 0, 0] };
    expect(movidaValida(t, 0, 1)).toBe(true);
    intercambiar(t, 0, 1);
    const p = paso(t, [0, 1], [{ i: 1, tipo: t.celdas[0] }])!;
    expect([...p.fuera].sort((a, b) => a - b)).toEqual([0, 1, 4, 6]);
  });

  it('al caer, los especiales bajan con su producto', () => {
    const t = { cols: 2, filas: 3, celdas: [0, 1, 2, -1, 3, 1], esp: [0, ESP.bomba, 0, 0, 0, 0] };
    caer(t, 4, semilla(1));
    expect(t.celdas[3]).toBe(1);
    expect(t.esp![3]).toBe(ESP.bomba);
    expect(t.esp![1]).toBe(0);
  });

  it('buscarMovimiento devuelve una jugada válida', () => {
    const t = tableroNuevo(8, 6, 6, semilla(9));
    const m = buscarMovimiento(t)!;
    expect(movidaValida(t, m[0], m[1])).toBe(true);
  });

  it('al caer no quedan huecos', () => {
    const t = tableroNuevo(6, 5, 5, semilla(2));
    t.celdas[7] = -1;
    t.celdas[13] = -1;
    caer(t, 5, semilla(3));
    expect(t.celdas.every((v) => v >= 0)).toBe(true);
  });
});

describe('ritmo y combo', () => {
  it('las changas van más rápido en etapas altas', () => {
    expect(ritmoDeEtapa(0)).toBeCloseTo(1.15);
    expect(ritmoDeEtapa(9)).toBeCloseTo(1.6);
  });

  it('el combo sube con los aciertos seguidos', () => {
    expect([0, 2, 3, 5, 6, 9, 10, 30].map(multiplicadorCombo)).toEqual([1, 1, 1.5, 1.5, 2, 2, 2.5, 2.5]);
  });
});
