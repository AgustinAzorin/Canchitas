// Reglas puras del módulo de grupos.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { normalizarNombreDeGrupo } from '../../src/modules/grupos/domain/nombre-de-grupo.ts';

describe('RF-010 — nombre del grupo', () => {
  it('acepta de 1 a 60 caracteres y quita los espacios de más', () => {
    expect(normalizarNombreDeGrupo('  Los   del  sábado ')._unsafeUnwrap()).toBe('Los del sábado');
    expect(normalizarNombreDeGrupo('x').isOk()).toBe(true);
    expect(normalizarNombreDeGrupo('x'.repeat(60)).isOk()).toBe(true);
  });

  it('rechaza un nombre vacío, solo con espacios o de más de 60 caracteres', () => {
    for (const nombre of ['', '   ', 'x'.repeat(61)]) {
      expect(normalizarNombreDeGrupo(nombre)._unsafeUnwrapErr()).toEqual({
        tipo: 'NombreDeGrupoInvalido',
        largoMaximo: 60,
      });
    }
  });

  it('lo que acepta cumple el CHECK de la tabla grupo', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 80 }), (texto) => {
        const resultado = normalizarNombreDeGrupo(texto);
        if (resultado.isOk()) {
          const nombre = resultado.value;
          expect(nombre.trim()).toBe(nombre);
          expect(nombre.length).toBeGreaterThanOrEqual(1);
          expect(nombre.length).toBeLessThanOrEqual(60);
        }
      }),
    );
  });
});
