import { describe, expect, it } from 'vitest';
import { CHAPAS, MINIJUEGOS, RECICLABLES, catalogo, estadoMinijuego, lugarDeEtapa, opcionesCollar, pedidoCollar, pisada, precioCollar } from '../src/core/minijuegos';
import { CONFIG } from '../src/core/estado';

describe('catálogo de minijuegos', () => {
  it('en el callejón (etapa 0) hay cuatro changas para jugar', () => {
    const disp = catalogo(0).filter((x) => x.estado === 'disponible').map((x) => x.m.id);
    expect(disp.sort()).toEqual(['basura', 'collares', 'ratones', 'reciclaje']);
  });

  it('al mudarse cambian las changas: las del callejón dejan de aparecer', () => {
    expect(lugarDeEtapa(3)).toBe('plaza');
    const ids = catalogo(5).map((x) => x.m.id);
    expect(ids).not.toContain('basura');
    expect(ids).not.toContain('ratones');
    expect(ids).toContain('reparto');
  });

  it('cada etapa tiene al menos una changa y los rangos son válidos', () => {
    for (let etapa = 0; etapa <= CONFIG.metas.length; etapa++) {
      expect(MINIJUEGOS.some((m) => etapa >= m.desde && etapa <= m.hasta)).toBe(true);
    }
    for (const m of MINIJUEGOS) expect(m.desde).toBeLessThanOrEqual(m.hasta);
  });

  it('los ids no se repiten', () => {
    expect(new Set(MINIJUEGOS.map((m) => m.id)).size).toBe(MINIJUEGOS.length);
  });

  it('estado según la etapa', () => {
    const ratones = MINIJUEGOS.find((m) => m.id === 'ratones')!;
    const reparto = MINIJUEGOS.find((m) => m.id === 'reparto')!;
    expect(estadoMinijuego(ratones, 0)).toBe('disponible');
    expect(estadoMinijuego(ratones, 3)).toBe('superado');
    expect(estadoMinijuego(reparto, 0)).toBe('bloqueado');
    expect(estadoMinijuego(reparto, 5)).toBe('proximamente');
  });
});

describe('collares', () => {
  it('los pedidos se alargan y usan más colores al vender', () => {
    const fijo = () => 0.999;
    expect(pedidoCollar(0, fijo)).toHaveLength(3);
    expect(new Set(pedidoCollar(0, () => Math.random())).size).toBeLessThanOrEqual(3);
    expect(pedidoCollar(20, fijo)).toHaveLength(8);
    expect(pedidoCollar(20, fijo)[0]).toBe(CHAPAS[opcionesCollar(20) - 1]);
    expect(opcionesCollar(100)).toBeLessThanOrEqual(CHAPAS.length);
  });

  it('un collar largo vale más', () => {
    expect(precioCollar(6)).toBeGreaterThan(precioCollar(5) + 2);
  });
});

it('todo lo reciclable tiene tacho', () => {
  for (const t of Object.values(RECICLABLES)) expect(['plastico', 'vidrio', 'papel', 'metal']).toContain(t);
});

it('cada tacho tiene al menos dos objetos distintos', () => {
  for (const t of ['plastico', 'vidrio', 'papel', 'metal']) {
    expect(Object.values(RECICLABLES).filter((x) => x === t).length).toBeGreaterThanOrEqual(2);
  }
});

it('en la carrera, alternar patas acelera y repetir frena', () => {
  expect(pisada(10, 'der', 'izq')).toBeGreaterThan(10);
  expect(pisada(10, 'izq', 'izq')).toBeLessThan(10);
  expect(pisada(0, 'izq', null)).toBeGreaterThan(0);
});
