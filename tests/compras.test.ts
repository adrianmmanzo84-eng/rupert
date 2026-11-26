import { describe, expect, it } from 'vitest';
import { nuevoEstado, normalizar, pagarMinijuego } from '../src/core/estado';
import { INSIGNIAS, MAX_POR_DIA, PRODUCTOS, acreditar, modoDePago, revisarInsignias, vetoDeCompra } from '../src/core/compras';

const T = new Date('2026-11-26T12:00:00').getTime();

describe('compras', () => {
  it('ids válidos para Play Console y cada ayuda da algo al comprador', () => {
    for (const p of PRODUCTOS) {
      expect(p.id).toMatch(/^[a-z0-9_]+$/);
      expect(p.monedas + Object.values(p.objetos).reduce((a, b) => a + (b ?? 0), 0) + (p.insignia ? 1 : 0)).toBeGreaterThan(0);
    }
  });

  it('acredita una sola vez cada recibo y suma al fondo sin tope diario', () => {
    const e = nuevoEstado(T);
    expect(acreditar(e, 'ayuda_mediana', 'R1', T)).toBe('ok');
    expect(e.fondo).toBe(330);
    expect(e.aportado).toBe(330);
    expect(e.paraServidor).toBe(330);
    expect(e.monedas).toBe(40 + 300);
    expect(e.inventario.sopa).toBe(2);
    expect(e.insignias).toContain('plata');
    expect(e.insignias).toContain('amigo');
    expect(acreditar(e, 'ayuda_mediana', 'R1', T)).toBe('repetida');
    expect(e.fondo).toBe(330);
  });

  it('tope de compras por día y el pase no se compra dos veces en la misma meta', () => {
    const e = nuevoEstado(T);
    for (let i = 0; i < MAX_POR_DIA; i++) acreditar(e, 'monedas_1000', `M${i}`, T);
    expect(vetoDeCompra(e, 'monedas_1000', T)).toBe('limite');
    expect(vetoDeCompra(e, 'monedas_1000', T + 86_400_000)).toBeNull();
    const f = nuevoEstado(T);
    acreditar(f, 'pase_temporada', 'P1', T);
    expect(vetoDeCompra(f, 'pase_temporada', T)).toBe('pase_activo');
    f.etapa = 1;
    expect(vetoDeCompra(f, 'pase_temporada', T)).toBeNull();
  });

  it('el pase duplica las monedas de las changas solo durante su meta', () => {
    const e = nuevoEstado(T);
    e.hambre = e.higiene = e.animo = 100;
    expect(pagarMinijuego(e, 10)).toBe(10);
    e.pase = e.etapa;
    expect(pagarMinijuego(e, 10)).toBe(20);
    e.etapa += 1;
    expect(pagarMinijuego(e, 10)).toBe(10);
  });

  it('insignias por aportes gratis acumulados', () => {
    const e = nuevoEstado(T);
    e.aportado = 120;
    expect(revisarInsignias(e).map((i) => i.id)).toEqual(['vecino', 'amigo']);
    expect(revisarInsignias(e)).toEqual([]);
    for (const p of PRODUCTOS) if (p.insignia) expect(INSIGNIAS.map((i) => i.id)).toContain(p.insignia);
  });

  it('las partidas viejas se cargan sin compras ni insignias', () => {
    const e = normalizar({ monedas: 5 }, T);
    expect(e.insignias).toEqual([]);
    expect(e.compras.recibos).toEqual([]);
    expect(e.pase).toBe(-1);
  });

  it('se cobra con Google Play solo en la app publicada; en pruebas es simulado; en la web no se vende', () => {
    expect(modoDePago({ nativo: true, depuracion: false, pruebas: false })).toBe('play');
    expect(modoDePago({ nativo: true, depuracion: true, pruebas: false })).toBe('simulada');
    expect(modoDePago({ nativo: false, depuracion: false, pruebas: true })).toBe('simulada');
    expect(modoDePago({ nativo: false, depuracion: false, pruebas: false })).toBe('ninguna');
  });
});
