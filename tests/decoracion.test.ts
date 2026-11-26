import { describe, expect, it } from 'vitest';
import { DECORACIONES, type Hueco, paraHueco, ponerDecoracion, quitarDecoracion } from '../src/core/decoracion';
import { nuevoEstado, normalizar } from '../src/core/estado';
import { ESCENARIOS } from '../src/core/lugares';

const T0 = new Date('2026-11-26T10:00:00').getTime();
const estante: Hueco = { id: 'estante1', nombre: 'Estante', tipo: 'estante', x: 150, y: 46, ancho: 56, alto: 18 };
const mesa: Hueco = { id: 'mesa', nombre: 'Mesa', tipo: 'mesa', x: 238, y: 151, ancho: 90, alto: 34 };

describe('decoración de la casa', () => {
  it('comprar cobra una sola vez y lo pone en el hueco', () => {
    const e = nuevoEstado(T0);
    e.monedas = 200;
    expect(ponerDecoracion(e, estante, 'radio')).toBe('puesto');
    expect(e.monedas).toBe(80);
    expect(e.casa.estante1).toBe('radio');
    quitarDecoracion(e, 'estante1');
    expect(ponerDecoracion(e, estante, 'radio')).toBe('puesto');
    expect(e.monedas).toBe(80);
  });

  it('sin monedas no se compra y no se puede poner donde no va', () => {
    const e = nuevoEstado(T0);
    e.monedas = 10;
    expect(ponerDecoracion(e, estante, 'radio')).toBe('sin-monedas');
    e.monedas = 999;
    expect(ponerDecoracion(e, mesa, 'patito')).toBe('no-entra');
  });

  it('un objeto está en un solo hueco: ponerlo en otro lo mueve', () => {
    const e = nuevoEstado(T0);
    e.monedas = 999;
    ponerDecoracion(e, estante, 'reloj');
    ponerDecoracion(e, mesa, 'reloj');
    expect(e.casa.estante1).toBeUndefined();
    expect(e.casa.mesa).toBe('reloj');
  });

  it('todos los huecos de la casa tienen algo para poner', () => {
    for (const h of ESCENARIOS.casa.huecos ?? []) expect(paraHueco(h.tipo).length).toBeGreaterThan(0);
    expect(new Set(DECORACIONES.map((d) => d.id)).size).toBe(DECORACIONES.length);
  });

  it('la decoración se guarda y se repara al cargar', () => {
    const r = normalizar({ decoraciones: ['radio', 'radio', 3], casa: { estante1: 'radio', mesa: 7 } }, T0);
    expect(r.decoraciones).toEqual(['radio']);
    expect(r.casa).toEqual({ estante1: 'radio' });
  });
});
