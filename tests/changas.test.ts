import { describe, expect, it } from 'vitest';
import {
  ARREGLOS,
  HERRAMIENTAS,
  INGREDIENTES,
  PEATONES,
  PIEZAS,
  RECETAS,
  averias,
  cantidadAverias,
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
    for (const p of a) expect(PIEZAS).toContain(p);
    expect(cantidadAverias(0, 8)).toBe(1);
    expect(cantidadAverias(4, 8)).toBe(3);
    expect(cantidadAverias(0, 9)).toBe(2);
    expect(cantidadAverias(50, 9)).toBe(4);
  });
});
