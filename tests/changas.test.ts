import { describe, expect, it } from 'vitest';
import {
  ARREGLOS,
  CAPAS_TALLER,
  COLORES_AUTO,
  HERRAMIENTAS,
  INGREDIENTES,
  PEATONES,
  PIEZAS,
  RECETAS,
  averias,
  cantidadAverias,
  colorAuto,
  entregarVolante,
  esperaPeaton,
  pasoCocina,
  puntosArreglo,
  siguienteArreglo,
  siguienteReceta,
} from '../src/core/changas';

describe('repartir volantes', () => {
  it('hay que dárselo a quien pasa frente a Rupert y quiera recibirlo', () => {
    const oficinista = PEATONES[0];
    const corredora = PEATONES.find((p) => p.nombre === 'corredora')!;
    expect(entregarVolante(oficinista, true)).toEqual({ resultado: 'entregado', puntos: 3 });
    expect(entregarVolante(oficinista, false).resultado).toBe('lejos');
    expect(entregarVolante(corredora, true).resultado).toBe('rechazado');
    for (const p of PEATONES.filter((x) => !x.acepta)) expect(p.excusa).toBeTruthy();
  });

  it('los peatones llegan cada vez más seguido, sin pasar de un mínimo', () => {
    expect(esperaPeaton(0)).toBeGreaterThan(esperaPeaton(30));
    expect(esperaPeaton(1000)).toBe(0.9);
  });
});

describe('arreglos', () => {
  it('cada objeto roto pide una herramienta que existe y el pedido no se repite seguido', () => {
    for (const a of ARREGLOS) expect(HERRAMIENTAS).toContain(a.herramienta);
    let ant: string | null = null;
    for (let i = 0; i < 50; i++) {
      const a = siguienteArreglo(ant);
      expect(a.objeto).not.toBe(ant);
      ant = a.objeto;
    }
  });

  it('rápido vale más, la herramienta equivocada descuenta', () => {
    expect(puntosArreglo(true, 2)).toBe(7);
    expect(puntosArreglo(true, 6)).toBe(5);
    expect(puntosArreglo(false, 1)).toBe(-2);
  });
});

describe('cocinar recetas', () => {
  it('las recetas usan ingredientes que existen, sin repetir ninguno', () => {
    for (const r of RECETAS) {
      for (const p of r.pasos) expect(INGREDIENTES).toContain(p);
      expect(new Set(r.pasos).size).toBe(r.pasos.length);
    }
  });

  it('primero el utensilio y después los ingredientes en orden', () => {
    const r = RECETAS[0];
    expect(pasoCocina(r, 0, 'sarten')).toBe('mal');
    expect(pasoCocina(r, 0, 'olla')).toBe('bien');
    expect(pasoCocina(r, 1, 'huevo')).toBe('mal');
    expect(pasoCocina(r, 1, 'arroz')).toBe('bien');
    expect(pasoCocina(r, 2, 'huevo')).toBe('listo');
  });

  it('no repite la misma receta dos veces seguidas', () => {
    let ant: string | null = null;
    for (let i = 0; i < 50; i++) {
      const r = siguienteReceta(ant);
      expect(r.nombre).not.toBe(ant);
      ant = r.nombre;
    }
  });
});

describe('reparar el auto', () => {
  it('las averías son piezas distintas y crecen con los autos arreglados', () => {
    const a = averias(4);
    expect(new Set(a).size).toBe(4);
    for (const id of a) expect(CAPAS_TALLER.map((c) => c.id)).toContain(id);
    expect(cantidadAverias(0, 8)).toBe(1);
    expect(cantidadAverias(4, 8)).toBe(3);
    expect(cantidadAverias(0, 9)).toBe(2);
    expect(cantidadAverias(50, 9)).toBe(4);
  });
});

describe('piezas del vano', () => {
  it('cada pieza montada es de un tipo con repuesto, y hay 4 bujías', () => {
    expect(CAPAS_TALLER).toHaveLength(13);
    for (const c of CAPAS_TALLER) expect(PIEZAS).toContain(c.pieza);
    for (const p of PIEZAS) expect(CAPAS_TALLER.some((c) => c.pieza === p)).toBe(true);
    expect(CAPAS_TALLER.filter((c) => c.pieza === 'bujia')).toHaveLength(4);
  });
});

describe('color del auto', () => {
  it('nunca repite el color del auto anterior', () => {
    for (let ant = 0; ant < COLORES_AUTO.length; ant++) {
      for (let k = 0; k < 20; k++) {
        const c = colorAuto(ant, () => k / 20);
        expect(c).not.toBe(ant);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(COLORES_AUTO.length);
      }
    }
  });
});
