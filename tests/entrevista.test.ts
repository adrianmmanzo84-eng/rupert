import { describe, expect, it } from 'vitest';
import { PREGUNTAS, PREGUNTAS_POR_ENTREVISTA, armarEntrevista, resultadoEntrevista } from '../src/core/entrevista';

describe('entrevista de trabajo', () => {
  it('cada pregunta tiene una respuesta buena, una regular y una mala', () => {
    for (const p of PREGUNTAS) {
      expect(p.respuestas.map((r) => r.calidad).sort()).toEqual(['buena', 'mala', 'regular']);
    }
  });

  it('arma cinco preguntas distintas y no siempre en el mismo orden', () => {
    const a = armarEntrevista();
    expect(a).toHaveLength(PREGUNTAS_POR_ENTREVISTA);
    expect(new Set(a.map((p) => p.texto)).size).toBe(PREGUNTAS_POR_ENTREVISTA);
    const primeras = new Set(Array.from({ length: 30 }, () => armarEntrevista()[0].texto));
    expect(primeras.size).toBeGreaterThan(1);
  });

  it('lo contratan con 4 buenas y 1 regular o más, y suma el premio', () => {
    expect(resultadoEntrevista(50)).toMatchObject({ contratado: true, total: 60 });
    expect(resultadoEntrevista(44)).toMatchObject({ contratado: true, total: 54 });
    expect(resultadoEntrevista(40)).toMatchObject({ contratado: true, total: 50 });
    expect(resultadoEntrevista(38)).toMatchObject({ contratado: false, total: 38 });
    expect(resultadoEntrevista(0).contratado).toBe(false);
  });
});
