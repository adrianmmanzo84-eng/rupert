import { describe, expect, it } from 'vitest';
import {
  ES,
  N,
  O,
  S,
  aVaciar,
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

  it('una línea de 4 vacía su fila y una de 5 todo su tipo', () => {
    const t = { cols: 5, filas: 2, celdas: [0, 0, 0, 0, 1, 2, 3, 0, 2, 3] };
    const ls = lineas(t);
    expect(ls).toHaveLength(1);
    expect([...aVaciar(t, ls)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
    const u = { cols: 5, filas: 2, celdas: [1, 1, 1, 1, 1, 2, 1, 3, 2, 3] };
    expect(aVaciar(u, lineas(u)).has(6)).toBe(true);
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
