import { describe, expect, it } from 'vitest';
import { acertijo, distractores, nivelExamen, puntosExamen } from '../src/core/examenes';

/** Azar repetible para las pruebas. */
function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('exámenes de ingenio', () => {
  it('cada acertijo tiene 4 opciones distintas, positivas y enteras, una sola correcta', () => {
    const azar = semilla(7);
    for (let nivel = 0; nivel <= 6; nivel++) {
      for (let i = 0; i < 300; i++) {
        const a = acertijo(nivel, azar);
        expect(a.opciones).toHaveLength(4);
        expect(new Set(a.opciones).size).toBe(4);
        expect(a.opciones.filter((o) => o === a.correcta)).toHaveLength(1);
        for (const o of a.opciones) {
          expect(o).toBeGreaterThan(0);
          expect(Number.isInteger(o)).toBe(true);
        }
      }
    }
  });

  it('las cuentas dan lo que dicen', () => {
    const azar = semilla(3);
    for (let i = 0; i < 500; i++) {
      const a = acertijo(4, azar);
      const m = a.pregunta.match(/^(\d+) ([+−×]) (\d+) = \?$/);
      if (!m) continue;
      const [x, y] = [Number(m[1]), Number(m[3])];
      const r = m[2] === '+' ? x + y : m[2] === '−' ? x - y : x * y;
      expect(a.correcta).toBe(r);
    }
  });

  it('los distractores no repiten la correcta', () => {
    const d = distractores(5, () => 0.99, 5);
    expect(d).toHaveLength(3);
    expect(d).not.toContain(5);
    for (const v of d) expect(v).toBeGreaterThan(0);
  });

  it('se pone más difícil con los aciertos y en etapas más altas', () => {
    expect(nivelExamen(0, 7)).toBe(0);
    expect(nivelExamen(6, 7)).toBe(2);
    expect(nivelExamen(0, 9)).toBe(2);
    expect(nivelExamen(100, 9)).toBe(6);
  });

  it('los aciertos seguidos valen más y un error descuenta poco', () => {
    expect(puntosExamen(true, 0)).toBe(4);
    expect(puntosExamen(true, 3)).toBe(7);
    expect(puntosExamen(true, 10)).toBe(8);
    expect(puntosExamen(false, 5)).toBe(-2);
  });
});
