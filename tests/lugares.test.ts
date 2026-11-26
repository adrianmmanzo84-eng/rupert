import { describe, expect, it } from 'vitest';
import { ESCENARIOS, FONDOS, escenarioDeEtapa, fondoDeEtapa } from '../src/core/lugares';
import { MINIJUEGOS } from '../src/core/minijuegos';
import { CONFIG } from '../src/core/estado';

describe('escenarios de cada lugar', () => {
  it('cada etapa tiene un escenario con fondo', () => {
    for (let etapa = 0; etapa <= CONFIG.metas.length; etapa++) {
      expect(escenarioDeEtapa(etapa)).toBeTruthy();
      expect(FONDOS).toContain(fondoDeEtapa(etapa));
    }
  });

  it('el callejón cambia de fondo en la etapa 1 y Rupert se muda a la plaza en la 3', () => {
    expect(fondoDeEtapa(0)).toBe('callejon_e0');
    expect(fondoDeEtapa(2)).toBe('callejon_e1');
    expect(escenarioDeEtapa(3).lugar).toBe('plaza');
    expect(escenarioDeEtapa(5).lugar).toBe('ciudad');
    expect(escenarioDeEtapa(9).lugar).toBe('casa');
  });

  for (const esc of Object.values(ESCENARIOS)) {
    it(`${esc.lugar}: zonas, suelo y objetos dentro de la pantalla`, () => {
      const s = esc.suelo;
      expect(esc.inicio.x).toBeGreaterThanOrEqual(s.x0);
      expect(esc.inicio.x).toBeLessThanOrEqual(s.x1);
      expect(esc.inicio.y).toBeGreaterThanOrEqual(s.y0);
      expect(esc.inicio.y).toBeLessThanOrEqual(s.y1);
      for (const z of esc.zonas) {
        expect(z.x0).toBeLessThan(z.x1);
        expect(z.y0).toBeLessThan(z.y1);
        expect(z.x1).toBeLessThanOrEqual(480);
        expect(z.mirar.length).toBeGreaterThan(0);
        if (z.usar.tipo === 'changa') {
          const id = z.usar.id;
          expect(MINIJUEGOS.some((m) => m.id === id)).toBe(true);
        }
      }
      for (const r of esc.recogibles) {
        expect(r.x).toBeGreaterThanOrEqual(s.x0);
        expect(r.x).toBeLessThanOrEqual(s.x1 + 20);
      }
      expect(new Set(esc.zonas.map((z) => z.id)).size).toBe(esc.zonas.length);
    });
  }
});
