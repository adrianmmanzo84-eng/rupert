import { describe, expect, it } from 'vitest';
import { CUPO_BARRIO, DIAS_INACTIVO, asignarBarrio, estaActivo, metasDeBarrio } from '../src/core/barrios';
import { CONFIG } from '../src/core/estado';

describe('barrios', () => {
  it('con 500 vecinos, las metas son las del documento de concepto', () => {
    expect(CUPO_BARRIO).toBe(500);
    expect(metasDeBarrio()).toEqual([5000, 15000, 30000, 50000, 80000, 120000, 180000, 260000, 400000]);
    expect(CONFIG.metas).toEqual(metasDeBarrio());
    expect(metasDeBarrio(12)[0]).toBe(120);
  });

  it('los nuevos van al barrio más antiguo con lugar; si todos están llenos, se abre otro', () => {
    expect(asignarBarrio([])).toEqual({ id: 1, nuevo: true });
    const b = [
      { id: 2, vecinos: 120, cupo: 500 },
      { id: 1, vecinos: 500, cupo: 500 },
      { id: 3, vecinos: 10, cupo: 500 },
    ];
    expect(asignarBarrio(b)).toEqual({ id: 2, nuevo: false });
    expect(asignarBarrio(b.map((x) => ({ ...x, vecinos: 500 })))).toEqual({ id: 4, nuevo: true });
  });

  it('a los 30 días sin entrar se libera el lugar', () => {
    const dia = 86_400_000;
    expect(estaActivo(0, (DIAS_INACTIVO - 1) * dia)).toBe(true);
    expect(estaActivo(0, DIAS_INACTIVO * dia)).toBe(false);
  });
});
