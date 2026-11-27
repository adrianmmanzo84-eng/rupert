import { describe, expect, it } from 'vitest';
import { MINIJUEGOS, catalogo, estadoMinijuego, recuerdos } from '../src/core/minijuegos';
import { MUEBLES, cabe, hayLugar, llenado, medidas, nuevoBaul, poner, premioBaul, siguientePieza } from '../src/core/mudanza';
import { MENU_CAFETERIA, pedidoCafeteria, pedidoCorrecto, puntosEntrega } from '../src/core/cafeteria';
import { normalizar } from '../src/core/estado';

describe('catálogo de la fase 3 (R044)', () => {
  it('la entrevista se juega una sola vez y después queda en Recuerdos', () => {
    const ent = MINIJUEGOS.find((m) => m.id === 'entrevista')!;
    expect(estadoMinijuego(ent, 4)).toBe('disponible');
    expect(estadoMinijuego(ent, 7)).toBe('disponible');
    expect(estadoMinijuego(ent, 4, { jugadas: { Entrevista: 1 } })).toBe('hecho');
    expect(recuerdos(4, { jugadas: { Entrevista: 1 } }).map((m) => m.id)).toContain('entrevista');
    expect(catalogo(4, { jugadas: { Entrevista: 1 } }).map((x) => x.m.id)).not.toContain('entrevista');
  });

  it('los Recuerdos son las changas superadas, sin el evento del domingo', () => {
    const ids = recuerdos(9).map((m) => m.id);
    expect(ids).toContain('basura');
    expect(ids).toContain('collares');
    expect(ids).not.toContain('ratones');
    expect(ids).not.toContain('cocina');
    expect(recuerdos(0)).toHaveLength(0);
  });

  it('las changas nuevas aparecen en su etapa y la bici sigue hasta la 9', () => {
    const disp = (e: number) => catalogo(e).filter((x) => x.estado === 'disponible').map((x) => x.m.id);
    expect(disp(7)).toContain('cafeteria');
    expect(disp(8)).toContain('mudanza');
    expect(disp(9)).toEqual(expect.arrayContaining(['jardin', 'mudanza', 'cafeteria', 'reparto']));
    expect(disp(6)).not.toContain('cafeteria');
  });

  it('las jugadas se guardan y se reparan', () => {
    expect(normalizar({ jugadas: { Basura: 3, malo: -1, x: 'y' } }, 0).jugadas).toEqual({ Basura: 3 });
  });
});

describe('cargar la mudanza (R044)', () => {
  it('las piezas ocupan su rectángulo, giran y no se pisan', () => {
    const b = nuevoBaul(8, 5);
    const hel = MUEBLES.find((m) => m.id === 'heladera')!;
    expect(medidas(hel, true)).toEqual({ w: 3, h: 2 });
    expect(poner(b, 2, 3, 0, 0, 1)).toBe(true);
    expect(cabe(b, 1, 1, 1, 2)).toBe(false);
    expect(cabe(b, 1, 1, 2, 2)).toBe(true);
    expect(cabe(b, 2, 3, 7, 0)).toBe(false);
    expect(llenado(b)).toBeCloseTo(6 / 40);
  });

  it('el baúl lleno da el premio máximo, y siempre sale una pieza que entra si hay lugar', () => {
    const b = nuevoBaul(4, 2);
    for (let i = 0; i < 8; i++) poner(b, 1, 1, i % 4, Math.floor(i / 4), i + 1);
    expect(premioBaul(b)).toBe(40);
    const c = nuevoBaul(8, 5);
    poner(c, 8, 4, 0, 0, 1);
    for (let i = 0; i < 50; i++) expect(hayLugar(c, siguientePieza(c))).toBe(true);
  });
});

describe('turno en la cafetería (R044)', () => {
  it('el pedido es correcto sin importar el orden, y la propina depende de la paciencia', () => {
    expect(pedidoCorrecto(['cafe', 'sopa'], ['sopa', 'cafe'])).toBe(true);
    expect(pedidoCorrecto(['cafe'], ['cafe', 'cafe'])).toBe(false);
    expect(pedidoCorrecto(['cafe', 'manzana'], ['cafe', 'sopa'])).toBe(false);
    expect(puntosEntrega(['cafe', 'sopa'], 1)).toBe(14);
    expect(puntosEntrega(['cafe', 'sopa'], 0)).toBe(8);
  });
  it('los pedidos se alargan con el turno', () => {
    for (let i = 0; i < 50; i++) expect(pedidoCafeteria(0).length).toBe(1);
    expect(Math.max(...Array.from({ length: 200 }, () => pedidoCafeteria(9).length))).toBe(3);
    for (const p of pedidoCafeteria(9)) expect(MENU_CAFETERIA).toContain(p);
  });
});
