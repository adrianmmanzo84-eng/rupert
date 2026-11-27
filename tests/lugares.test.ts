import { describe, expect, it } from 'vitest';
import { ESCENARIOS, EXTRAS, FONDOS, VISITAS, escenarioDeEtapa, escenarioPorId, fondoDeEtapa } from '../src/core/lugares';
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

  it('la casa propia tiene interior y jardín, y no se puede ir al jardín desde otro lugar', () => {
    expect(escenarioDeEtapa(9).id).toBe('casa');
    expect(escenarioPorId('jardin', 9).id).toBe('jardin');
    expect(escenarioPorId('jardin', 3).id).toBe('plaza');
  });

  it('las visitas de los hitos tienen su fondo cargado', () => {
    for (const v of Object.values(VISITAS)) expect(FONDOS).toContain(v.fondo);
  });

  for (const esc of [...Object.values(ESCENARIOS), ...Object.values(EXTRAS)]) {
    it(`${esc.id}: zonas, suelo y objetos dentro de la pantalla`, () => {
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
        if (z.usar.tipo === 'ir') {
          const destino = escenarioPorId(z.usar.a, 9);
          expect(destino.id).toBe(z.usar.a);
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

describe('duchas públicas', () => {
  it('cada escenario de la calle tiene ducha en todas sus etapas', async () => {
    const { ESCENARIOS, duchaDe, rectDucha } = await import('../src/core/lugares');
    const calle = [ESCENARIOS.callejon, ESCENARIOS.plaza, ESCENARIOS.ciudad];
    const etapas: Record<string, number[]> = { callejon: [0, 1, 2], plaza: [3, 4], ciudad: [5] };
    for (const esc of calle) {
      for (const et of etapas[esc.id]) {
        const d = duchaDe(esc, et);
        expect(d, `${esc.id} etapa ${et}`).not.toBeNull();
        const r = rectDucha(d!);
        // La abertura queda dentro de la cabina y Rupert se para sobre el suelo.
        expect(r.abertura.x0).toBeGreaterThan(r.x0);
        expect(r.abertura.x1).toBeLessThan(r.x1);
        expect(d!.py).toBeGreaterThanOrEqual(esc.suelo.y0);
        expect(d!.py).toBeLessThanOrEqual(esc.suelo.y1);
      }
    }
    expect(duchaDe(ESCENARIOS.pieza, 6)).toBeNull();
  });
});
