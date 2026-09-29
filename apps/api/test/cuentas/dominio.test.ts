// Reglas puras del módulo de cuentas (ADR 0014: fast-check para reglas con aritmética de fechas
// y secuencias).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  bloqueoVigente,
  duracionDelBloqueoMs,
  intentosAntesDelBloqueo,
  registrarFallo,
  sinIntentos,
  type IntentosDeInicio,
} from '../../src/modules/cuentas/domain/bloqueo.ts';
import { cumpleEdadMinima } from '../../src/modules/cuentas/domain/edad.ts';
import {
  diasDelMes,
  leerFechaCalendario,
  type FechaCalendario,
} from '../../src/modules/cuentas/domain/fecha-calendario.ts';
import { normalizarNombreDeUsuario } from '../../src/modules/cuentas/domain/nombre-de-usuario.ts';

const fecha = (texto: string): FechaCalendario => leerFechaCalendario(texto)._unsafeUnwrap();

const fechaArbitraria = fc
  .record({
    anio: fc.integer({ min: 1900, max: 2100 }),
    mes: fc.integer({ min: 1, max: 12 }),
    dia: fc.integer({ min: 1, max: 31 }),
  })
  .map(({ anio, mes, dia }) => ({ anio, mes, dia: Math.min(dia, diasDelMes(anio, mes)) }));

/** Referencia independiente: lo que hace Postgres con `fecha - interval '18 years'`. */
function limiteSegunDate(hoy: FechaCalendario): number {
  const d = new Date(Date.UTC(hoy.anio - 18, hoy.mes - 1, 1));
  d.setUTCDate(Math.min(hoy.dia, new Date(Date.UTC(hoy.anio - 18, hoy.mes, 0)).getUTCDate()));
  return d.getTime();
}

describe('RF-002 y RN-20 — edad mínima de 18 años', () => {
  it('rechaza a quien tiene 17 años', () => {
    expect(cumpleEdadMinima(fecha('2009-06-15'), fecha('2026-09-29'))).toBe(false);
  });

  it('acepta a quien cumple 18 hoy', () => {
    expect(cumpleEdadMinima(fecha('2008-09-29'), fecha('2026-09-29'))).toBe(true);
  });

  it('rechaza a quien cumple 18 mañana', () => {
    expect(cumpleEdadMinima(fecha('2008-09-30'), fecha('2026-09-29'))).toBe(false);
  });

  it('quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos, como Postgres', () => {
    expect(cumpleEdadMinima(fecha('2008-02-29'), fecha('2026-02-28'))).toBe(false);
    expect(cumpleEdadMinima(fecha('2008-02-29'), fecha('2026-03-01'))).toBe(true);
  });

  it('coincide con el CHECK mayor_de_edad de la base para cualquier par de fechas', () => {
    fc.assert(
      fc.property(fechaArbitraria, fechaArbitraria, (nacimiento, hoy) => {
        const esperado =
          Date.UTC(nacimiento.anio, nacimiento.mes - 1, nacimiento.dia) <= limiteSegunDate(hoy);
        expect(cumpleEdadMinima(nacimiento, hoy)).toBe(esperado);
      }),
    );
  });
});

describe('RF-002 — fecha de nacimiento', () => {
  it.each(['2001-02-29', '2000-04-31', '2000-13-01', '2000-00-10', '20-01-01', 'ayer'])(
    'rechaza %s',
    (texto) => {
      expect(leerFechaCalendario(texto)._unsafeUnwrapErr()).toEqual({ tipo: 'FechaInvalida' });
    },
  );

  it('acepta el 29 de febrero de un año bisiesto', () => {
    expect(fecha('2000-02-29')).toEqual({ anio: 2000, mes: 2, dia: 29 });
  });
});

describe('RF-003 — formato del nombre de usuario', () => {
  it.each([
    ['Juan.Perez', 'juan.perez'],
    ['  el_9  ', 'el_9'],
    ['abc', 'abc'],
    ['a'.repeat(20), 'a'.repeat(20)],
  ])('acepta %j y lo guarda como %j', (texto, esperado) => {
    expect(normalizarNombreDeUsuario(texto)._unsafeUnwrap()).toBe(esperado);
  });

  it.each(['ab', 'a'.repeat(21), 'con espacio', 'ñandú', 'guion-medio', 'arroba@'])(
    'rechaza %j',
    (texto) => {
      expect(normalizarNombreDeUsuario(texto).isErr()).toBe(true);
    },
  );
});

describe('RNF-011 — bloqueo tras 5 intentos fallidos consecutivos', () => {
  const t0 = new Date('2026-09-29T15:00:00.000Z');
  const mas = (ms: number) => new Date(t0.getTime() + ms);

  function fallar(veces: number, desde: IntentosDeInicio = sinIntentos): IntentosDeInicio {
    let intentos = desde;
    for (let i = 0; i < veces; i++) {
      intentos = registrarFallo(intentos, t0);
    }
    return intentos;
  }

  it('4 fallos no bloquean', () => {
    expect(bloqueoVigente(fallar(4), t0)).toBeNull();
  });

  it('el quinto fallo bloquea 15 minutos', () => {
    const intentos = fallar(5);
    expect(bloqueoVigente(intentos, t0)).toEqual(mas(duracionDelBloqueoMs));
    expect(bloqueoVigente(intentos, mas(duracionDelBloqueoMs - 1))).not.toBeNull();
    expect(bloqueoVigente(intentos, mas(duracionDelBloqueoMs))).toBeNull();
  });

  it('los intentos durante el bloqueo no lo alargan', () => {
    const bloqueado = fallar(5);
    expect(registrarFallo(bloqueado, mas(60_000))).toEqual(bloqueado);
  });

  it('vencido el bloqueo, el conteo arranca de cero', () => {
    const despues = registrarFallo(fallar(5), mas(duracionDelBloqueoMs));
    expect(despues).toEqual({ fallidosConsecutivos: 1, bloqueadoHasta: null });
  });

  it('para cualquier cantidad de fallos seguidos, bloquea si y solo si llegan a 5', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 30 }), (veces) => {
        const bloqueado = bloqueoVigente(fallar(veces), t0) !== null;
        expect(bloqueado).toBe(veces >= intentosAntesDelBloqueo);
      }),
    );
  });
});
