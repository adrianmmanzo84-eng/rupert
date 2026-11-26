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
    expect(ponerDecoracion(e, estante, 'radiocasete')).toBe('puesto');
    expect(e.monedas).toBe(90);
    expect(e.casa.estante1).toBe('radiocasete');
    quitarDecoracion(e, 'estante1');
    expect(ponerDecoracion(e, estante, 'radiocasete')).toBe('puesto');
    expect(e.monedas).toBe(90);
  });

  it('sin monedas no se compra y no se puede poner donde no va', () => {
    const e = nuevoEstado(T0);
    e.monedas = 10;
    expect(ponerDecoracion(e, estante, 'radiocasete')).toBe('sin-monedas');
    e.monedas = 999;
    expect(ponerDecoracion(e, mesa, 'heladera')).toBe('no-entra');
  });

  it('un hueco tiene un solo objeto: poner otro deja el anterior guardado', () => {
    const e = nuevoEstado(T0);
    e.monedas = 999;
    ponerDecoracion(e, estante, 'radiocasete');
    ponerDecoracion(e, mesa, 'cafetera');
    ponerDecoracion(e, mesa, 'tostadora');
    expect(e.casa.estante1).toBe('radiocasete');
    expect(e.casa.mesa).toBe('tostadora');
    expect(e.decoraciones).toContain('cafetera');
  });

  it('todos los huecos de la casa tienen algo para poner', () => {
    for (const h of ESCENARIOS.casa.huecos ?? []) expect(paraHueco(h.tipo).length).toBeGreaterThan(0);
    expect(new Set(DECORACIONES.map((d) => d.id)).size).toBe(DECORACIONES.length);
  });

  it('la decoración se guarda, se repara y olvida objetos que ya no se venden', () => {
    const r = normalizar({ decoraciones: ['heladera', 'heladera', 3, 'radio'], casa: { suelo1: 'heladera', mesa: 7, estante1: 'radio' } }, T0);
    expect(r.decoraciones).toEqual(['heladera']);
    expect(r.casa).toEqual({ suelo1: 'heladera' });
  });
});

it('solo se venden los electrodomésticos dibujados para la casa', () => {
  const ids = DECORACIONES.map((d) => d.id);
  for (const viejo of ['radio', 'osito', 'flores', 'patito', 'libros']) expect(ids).not.toContain(viejo);
  expect(paraHueco('suelo', () => false)).toEqual([]);
});
