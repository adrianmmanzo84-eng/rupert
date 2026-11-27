import { describe, expect, it } from 'vitest';
import {
  CONFIG, aportar, avanzarTiempo, charlar, comprar, comprobarMeta, descansar, multiplicador, normalizar,
  nuevoEstado, pagarMinijuego, puedeAportarPA, recoger, simularComunidad, usar, visitaDiaria,
} from '../src/core/estado';
import { cargar, guardar } from '../src/core/guardado';

const T0 = new Date('2026-11-26T10:00:00').getTime();
const HORA = 3_600_000;

describe('cuidado', () => {
  it('las barras bajan con el tiempo y nunca pasan de 0', () => {
    const e = nuevoEstado(T0);
    e.hambre = 50;
    avanzarTiempo(e, T0 + 2 * HORA);
    expect(e.hambre).toBeCloseTo(50 - 2 * CONFIG.bajaPorHora.hambre);
    avanzarTiempo(e, T0 + 200 * HORA);
    expect(e.hambre).toBe(0);
  });

  it('una ausencia larga se descuenta como mucho 48 horas', () => {
    const a = nuevoEstado(T0);
    const b = nuevoEstado(T0);
    a.animo = b.animo = 100;
    avanzarTiempo(a, T0 + 48 * HORA);
    avanzarTiempo(b, T0 + 500 * HORA);
    expect(b.animo).toBe(a.animo);
  });

  it('el ánimo baja el doble con hambre', () => {
    const lleno = nuevoEstado(T0);
    const hambriento = nuevoEstado(T0);
    lleno.hambre = lleno.higiene = 100;
    hambriento.hambre = 10;
    hambriento.higiene = 100;
    lleno.animo = hambriento.animo = 80;
    avanzarTiempo(lleno, T0 + HORA);
    avanzarTiempo(hambriento, T0 + HORA);
    expect(80 - hambriento.animo).toBeCloseTo(2 * (80 - lleno.animo));
  });

  it('comprar y usar objetos', () => {
    const e = nuevoEstado(T0);
    e.monedas = 30;
    e.hambre = 20;
    expect(comprar(e, 'sandwich')).toBe(true);
    expect(e.monedas).toBe(0);
    expect(comprar(e, 'manzana')).toBe(false);
    expect(usar(e, 'sandwich')).toBe(true);
    expect(e.hambre).toBe(55);
    expect(e.inventario.sandwich).toBe(1); // empieza con uno de regalo
  });

  it('la charla y el descanso respetan su espera', () => {
    const e = nuevoEstado(T0);
    expect(charlar(e, T0)).toBe(true);
    expect(charlar(e, T0 + 1000)).toBe(false);
    expect(charlar(e, T0 + HORA)).toBe(true);
    expect(descansar(e, T0)).toBe(true);
    expect(descansar(e, T0 + HORA)).toBe(false);
  });
});

describe('monedas y día', () => {
  it('el minijuego paga según el cuidado y nunca resta', () => {
    const e = nuevoEstado(T0);
    e.hambre = e.higiene = e.animo = 100;
    expect(multiplicador(e)).toBe(1);
    const antes = e.monedas;
    expect(pagarMinijuego(e, 50)).toBe(50);
    expect(pagarMinijuego(e, -20)).toBe(0);
    expect(e.monedas).toBe(antes + 50);
    e.hambre = e.higiene = e.animo = 0;
    expect(multiplicador(e)).toBe(0.5);
  });

  it('racha diaria: sube si vuelve al día siguiente; si falta un día usa la gracia, y si vuelve a faltar se corta', () => {
    const e = nuevoEstado(T0);
    expect(visitaDiaria(e, T0 + HORA).nuevoDia).toBe(false);
    const r = visitaDiaria(e, T0 + 24 * HORA);
    expect(r.nuevoDia).toBe(true);
    expect(e.racha).toBe(2);
    expect(r.regalo).toBe(CONFIG.regaloDiario[1]);
    expect(visitaDiaria(e, T0 + 72 * HORA).gracia).toBe(true);
    expect(e.racha).toBe(3);
    visitaDiaria(e, T0 + 120 * HORA);
    expect(e.racha).toBe(1);
  });

  it('cada objeto del suelo se recoge una vez por día', () => {
    const e = nuevoEstado(T0);
    expect(recoger(e, 'lata', 3)).toBe(true);
    expect(recoger(e, 'lata', 3)).toBe(false);
    visitaDiaria(e, T0 + 24 * HORA);
    expect(recoger(e, 'lata', 3)).toBe(true);
  });
});

describe('fondo común', () => {
  it('aportar respeta monedas y tope diario', () => {
    const e = nuevoEstado(T0);
    e.monedas = 10_000;
    expect(puedeAportarPA(e)).toBe(CONFIG.topeDiarioPA);
    expect(aportar(e, 1000)).toBe(CONFIG.topeDiarioPA);
    expect(aportar(e, 1)).toBe(0);
    expect(e.fondo).toBe(CONFIG.topeDiarioPA);
    visitaDiaria(e, T0 + 24 * HORA);
    expect(aportar(e, 5)).toBe(5);
    e.monedas = 25;
    expect(aportar(e, 5)).toBe(2);
  });

  it('la comunidad simulada suma por minuto, sin duplicar', () => {
    const e = nuevoEstado(T0);
    expect(simularComunidad(e, T0 + 90_000)).toBe(CONFIG.simuladoPAporMinuto);
    expect(simularComunidad(e, T0 + 100_000)).toBe(0);
  });

  it('al llenar la meta sube de etapa y sobra lo que pasó', () => {
    const e = nuevoEstado(T0);
    e.fondo = CONFIG.metas[0] + 7;
    expect(comprobarMeta(e)).toBe(true);
    expect(e.etapa).toBe(1);
    expect(e.fondo).toBe(7);
    expect(comprobarMeta(e)).toBe(false);
  });
});

describe('guardado', () => {
  it('guarda y recupera la partida', () => {
    const mapa = new Map<string, string>();
    const almacen = { getItem: (k: string) => mapa.get(k) ?? null, setItem: (k: string, v: string) => void mapa.set(k, v) } as Storage;
    const e = nuevoEstado(T0);
    e.monedas = 123;
    e.inventario.jabon = 2;
    guardar(e, almacen);
    const r = cargar(T0, almacen);
    expect(r.monedas).toBe(123);
    expect(r.inventario.jabon).toBe(2);
  });

  it('repara datos rotos o tramposos', () => {
    const r = normalizar({ monedas: -5, hambre: 900, etapa: 99, inventario: { sopa: 'x' }, recogidos: [1, 'lata'] }, T0);
    expect(r.monedas).toBe(0);
    expect(r.hambre).toBe(100);
    expect(r.etapa).toBe(CONFIG.metas.length);
    expect(r.inventario.sopa).toBe(0);
    expect(r.recogidos).toEqual(['lata']);
  });
});
