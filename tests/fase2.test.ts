import { describe, expect, it } from 'vitest';
import { PREMIO_TRES, avanzarMisiones, cobrarExtra, cobrarMision, generarMisiones, normalizarMisiones, porCobrar } from '../src/core/misiones';
import { hitoIntermedio, HITOS_INTERMEDIOS } from '../src/core/textos';
import { CONFIG, nuevoEstado, visitaDiaria } from '../src/core/estado';
import { apodoDe, haceCuanto, registroSimulado } from '../src/core/barrios';
import { planDeAvisos } from '../src/core/avisos';

const CHANGAS = [{ escena: 'Basura', nombre: 'Buscar en la basura' }, { escena: 'Reciclaje', nombre: 'Juntar para reciclar' }];

describe('misiones diarias (R043)', () => {
  it('son tres, distintas y las mismas para el mismo día', () => {
    const a = generarMisiones('2026-11-27', 3, CHANGAS, true);
    const b = generarMisiones('2026-11-27', 3, CHANGAS, true);
    expect(a.lista).toHaveLength(3);
    expect(new Set(a.lista.map((m) => m.id)).size).toBe(3);
    expect(a).toEqual(b);
    const dias = new Set(Array.from({ length: 10 }, (_, i) => generarMisiones(`2026-12-${10 + i}`, 3, CHANGAS, true).lista.map((m) => m.id).join()));
    expect(dias.size).toBeGreaterThan(3);
  });

  it('sin récords no pide superar uno', () => {
    for (let i = 0; i < 30; i++) expect(generarMisiones(`2026-10-${i}`, 0, CHANGAS, false).lista.some((m) => m.evento === 'record')).toBe(false);
  });

  it('avanza, se cobra una vez y las tres dan el premio extra', () => {
    const m = generarMisiones('2026-11-27', 2, CHANGAS, true);
    expect(cobrarExtra(m)).toBe(0);
    for (const x of m.lista) {
      expect(cobrarMision(m, x.id)).toBe(0);
      avanzarMisiones(m, x.evento, x.meta, x.changa);
    }
    expect(porCobrar(m)).toBe(3);
    for (const x of m.lista) {
      expect(cobrarMision(m, x.id)).toBe(x.premio);
      expect(cobrarMision(m, x.id)).toBe(0);
    }
    expect(cobrarExtra(m)).toBe(PREMIO_TRES);
    expect(cobrarExtra(m)).toBe(0);
    expect(porCobrar(m)).toBe(0);
  });

  it('una misión de una changa concreta no avanza con otra changa', () => {
    const m = { dia: 'x', extra: false, lista: [{ id: 'esta', evento: 'changa' as const, changa: 'Basura', texto: '', chiste: '', meta: 2, progreso: 0, premio: 25, cobrada: false }] };
    avanzarMisiones(m, 'changa', 1, 'Reciclaje');
    expect(m.lista[0].progreso).toBe(0);
    avanzarMisiones(m, 'changa', 1, 'Basura');
    expect(m.lista[0].progreso).toBe(1);
  });

  it('las guardadas se reparan', () => {
    expect(normalizarMisiones(null)).toBeNull();
    const m = generarMisiones('2026-11-27', 1, CHANGAS, false);
    expect(normalizarMisiones(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });
});

describe('metas intermedias (R043)', () => {
  it('hay tres por cada meta, y se celebra la más alta alcanzada una sola vez', () => {
    expect(HITOS_INTERMEDIOS).toHaveLength(CONFIG.metas.length);
    expect(hitoIntermedio(3, 10, 100, [])).toBeNull();
    expect(hitoIntermedio(3, 30, 100, [])?.claves).toEqual(['3.0']);
    // Saltó del 0 al 80 %: se festeja solo el tercero, los otros se dan por vistos.
    const h = hitoIntermedio(3, 80, 100, []);
    expect(h?.claves).toEqual(['3.0', '3.1', '3.2']);
    expect(h?.texto).toBe(HITOS_INTERMEDIOS[3][2]);
    expect(hitoIntermedio(3, 80, 100, ['3.0', '3.1', '3.2'])).toBeNull();
    expect(hitoIntermedio(9, 80, null, [])).toBeNull();
  });
});

describe('día de gracia de la racha (R043)', () => {
  const T = (d: string) => new Date(`${d}T12:00:00`).getTime();
  it('si falta un solo día, la racha sigue, una vez por semana', () => {
    const e = nuevoEstado(T('2026-11-01'));
    e.racha = 5;
    e.dia = '2026-11-01';
    expect(visitaDiaria(e, T('2026-11-03')).gracia).toBe(true);
    expect(e.racha).toBe(6);
    // Otra falta a los pocos días: ya no hay gracia.
    expect(visitaDiaria(e, T('2026-11-05')).gracia).toBe(false);
    expect(e.racha).toBe(1);
  });
  it('dos días seguidos sin entrar cortan la racha', () => {
    const e = nuevoEstado(T('2026-11-01'));
    e.racha = 5;
    e.dia = '2026-11-01';
    visitaDiaria(e, T('2026-11-04'));
    expect(e.racha).toBe(1);
  });
});

describe('registro del barrio y avisos (R043)', () => {
  it('los apodos son inventados y variados', () => {
    const a = new Set(Array.from({ length: 144 }, (_, i) => apodoDe(i)));
    expect(a.size).toBe(144);
    expect(apodoDe(0)).toBe('Gato del Kiosco');
  });
  it('el registro simulado es estable y ordenado del más nuevo al más viejo', () => {
    const r = registroSimulado(1_800_000_000_000);
    expect(r.length).toBeGreaterThan(5);
    expect(registroSimulado(1_800_000_000_000)).toEqual(r);
    for (let i = 1; i < r.length; i++) expect(r[i].en).toBeLessThan(r[i - 1].en);
    expect(haceCuanto(0, 4 * 60_000)).toBe('hace 4 min');
  });
  it('los avisos: hambre cuando baje de 25, regalo a las 10 y racha a las 20', () => {
    const e = nuevoEstado(0);
    e.hambre = 50;
    e.racha = 3;
    const ahora = new Date('2026-11-27T15:00:00').getTime();
    const plan = planDeAvisos(e, ahora);
    expect(plan.map((a) => a.id)).toEqual([1, 2, 3]);
    expect(plan[0].en).toBe(ahora + 5 * 3_600_000);
    expect(new Date(plan[1].en).getHours()).toBe(10);
    expect(new Date(plan[2].en).getHours()).toBe(20);
    e.hambre = 20;
    e.racha = 1;
    expect(planDeAvisos(e, ahora).map((a) => a.id)).toEqual([2]);
  });
});
