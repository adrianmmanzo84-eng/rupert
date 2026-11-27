import { describe, expect, it } from 'vitest';
import { CARTA_EPILOGO, CIERRE_EPILOGO, EPILOGO } from '../src/core/textos';
import { FONDOS } from '../src/core/lugares';
import { CONFIG, comprobarMeta, normalizar, nuevoEstado } from '../src/core/estado';

describe('epílogo de la primera parte (R041)', () => {
  it('cada página usa un fondo que el juego carga y un texto que entra en la caja', () => {
    expect(EPILOGO.length).toBeGreaterThanOrEqual(5);
    for (const p of EPILOGO) {
      expect(FONDOS).toContain(p.fondo);
      expect(p.texto.length).toBeLessThan(240);
      if (p.etapa !== undefined) expect(p.etapa).toBeLessThanOrEqual(CONFIG.metas.length);
    }
    // Recorre la historia en orden: del callejón a la casa, y termina con la carta.
    expect(EPILOGO[0].fondo).toBe('callejon_e0');
    expect(EPILOGO[EPILOGO.length - 1].carta).toBe(true);
    expect(CARTA_EPILOGO).toContain('Rupert');
    expect(CIERRE_EPILOGO.sigue).toMatch(/Rupert 2/);
  });

  it('la partida recuerda si ya se vio, y las viejas empiezan sin verlo', () => {
    const T = 1_700_000_000_000;
    expect(nuevoEstado(T).finalVisto).toBe(false);
    expect(normalizar({}, T).finalVisto).toBe(false);
    expect(normalizar({ finalVisto: true }, T).finalVisto).toBe(true);
  });

  it('al cumplir la última meta ya no queda meta (lo que dispara el epílogo)', () => {
    const e = nuevoEstado(0);
    e.etapa = CONFIG.metas.length - 1;
    e.fondo = CONFIG.metas[e.etapa];
    expect(comprobarMeta(e)).toBe(true);
    expect(e.etapa).toBe(CONFIG.metas.length);
  });
});

describe('récords por changa (R041)', () => {
  it('guarda el mejor puntaje y avisa solo al superarlo', async () => {
    const { anotarRecord } = await import('../src/core/estado');
    const e = nuevoEstado(0);
    expect(anotarRecord(e, 'Basura', 40)).toBe(0);
    expect(anotarRecord(e, 'Basura', 30)).toBeNull();
    expect(anotarRecord(e, 'Basura', 40)).toBeNull();
    expect(anotarRecord(e, 'Basura', 55)).toBe(40);
    expect(e.records.Basura).toBe(55);
    expect(normalizar({ records: { Basura: 55, malo: 'x', cero: 0 } }, 0).records).toEqual({ Basura: 55 });
  });
});

describe('consejos en contexto (R042)', () => {
  it('aparecen cuando hacen falta, uno por vez, y no se repiten', async () => {
    const { consejoPendiente } = await import('../src/core/estado');
    const e = nuevoEstado(0);
    e.hambre = 80; e.higiene = 80; e.animo = 80; e.monedas = 0;
    expect(consejoPendiente(e)).toBeNull();
    e.higiene = 30;
    expect(consejoPendiente(e)).toBe('necesidades');
    e.consejos.push('necesidades');
    e.inventario.sandwich = 0; e.hambre = 40; e.monedas = 60;
    expect(consejoPendiente(e)).toBe('tienda');
    e.consejos.push('tienda');
    expect(consejoPendiente(e)).toBe('fondo');
    e.consejos.push('fondo');
    expect(consejoPendiente(e)).toBeNull();
  });

  it('las partidas viejas (que vieron el tutorial largo) no reciben consejos', () => {
    expect(normalizar({ tutorial: true }, 0).consejos.length).toBeGreaterThan(0);
    expect(normalizar({ tutorial: false }, 0).consejos).toEqual([]);
    expect(normalizar(null, 0).consejos).toEqual([]);
  });
});

describe('preferencias de sonido (R042)', () => {
  it('se leen con valores por defecto y toleran basura', async () => {
    const { leerPreferencias } = await import('../src/audio/preferencias');
    expect(leerPreferencias(null)).toEqual({ musica: true, efectos: true, vibracion: true, avisos: true });
    expect(leerPreferencias('{"musica":false}')).toEqual({ musica: false, efectos: true, vibracion: true, avisos: true });
    expect(leerPreferencias('{roto')).toEqual({ musica: true, efectos: true, vibracion: true, avisos: true });
  });
});
