import { describe, expect, it } from 'vitest';
import {
  CARRILES,
  TIEMPO_MAX,
  conTiempo,
  intervalo,
  puntosPiso,
  siguienteTanda,
  velocidad,
} from '../src/core/escalada';

function semilla(s: number): () => number {
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe('escalar el edificio', () => {
  it('cada vez se sube más rápido, con tope, y caen más seguido', () => {
    expect(velocidad(20, 1.4)).toBeGreaterThan(velocidad(0, 1.4));
    expect(velocidad(500, 1.6)).toBe(170);
    expect(intervalo(0)).toBeCloseTo(1.2);
    expect(intervalo(100)).toBeCloseTo(0.45);
  });

  it('siempre queda un carril libre y las monedas llegan solas', () => {
    const azar = semilla(4);
    let monedas = 0;
    for (let i = 0; i < 400; i++) {
      const t = siguienteTanda(30, azar);
      const objetos = t.filter((c) => c.tipo === 'objeto');
      expect(new Set(objetos.map((c) => c.carril)).size).toBe(objetos.length);
      expect(objetos.length).toBeLessThan(CARRILES);
      if (t[0].tipo === 'moneda') {
        monedas += 1;
        expect(t).toHaveLength(1);
      }
    }
    expect(monedas).toBeGreaterThan(40);
    expect(monedas).toBeLessThan(140);
  });

  it('al principio nunca caen dos objetos a la vez', () => {
    const azar = semilla(9);
    for (let i = 0; i < 200; i++) expect(siguienteTanda(3, azar).length).toBe(1);
  });

  it('el tiempo no pasa del tope ni baja de cero', () => {
    expect(conTiempo(44, 3)).toBe(TIEMPO_MAX);
    expect(conTiempo(2, -3)).toBe(0);
    expect(puntosPiso(0)).toBe(2);
    expect(puntosPiso(25)).toBe(4);
  });
});
