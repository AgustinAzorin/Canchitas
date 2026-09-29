// Matriz de autorización completa (ADR 0014, RNF-013): un test por celda rol × acción, incluidas
// las denegaciones. La tabla esperada está escrita a mano acá, separada de la implementación:
// cambiar un permiso obliga a cambiar las dos.
import { describe, expect, it } from 'vitest';

import {
  acciones,
  accionesPermitidas,
  autorizar,
  decidir,
  rolDelActor,
  roles,
  type Accion,
  type Decision,
  type Rol,
} from '../../src/modules/grupos/domain/politicas.ts';

const si: Decision = { permitida: true };
const sinVerificar: Decision = { permitida: false, motivo: 'CuentaSinVerificar' };
const noMiembro: Decision = { permitida: false, motivo: 'NoEsMiembro' };
const noAdmin: Decision = { permitida: false, motivo: 'NoEsAdmin' };
const expulsado: Decision = { permitida: false, motivo: 'Expulsado' };

// Columnas: cuenta_sin_verificar, no_miembro, ex_miembro, expulsado, jugador, admin.
const esperada: Record<Accion, { requisito: string; celdas: readonly Decision[] }> = {
  crear_grupo: { requisito: 'RF-010', celdas: [sinVerificar, si, si, si, si, si] },
  ver_invitacion: { requisito: 'RN-27', celdas: [si, si, si, si, si, si] },
  unirse_por_link: {
    requisito: 'RF-011, RF-004 y RN-28',
    celdas: [sinVerificar, si, si, expulsado, si, si],
  },
  ver_grupo: {
    requisito: 'RNF-013',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, si, si],
  },
  ver_link: {
    requisito: 'RN-26',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  regenerar_link: {
    requisito: 'RF-012',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  crear_votacion: {
    requisito: 'RN-07',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  crear_partido: {
    requisito: 'RN-07',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  armar_equipos: {
    requisito: 'RN-07',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  cargar_resultado: {
    requisito: 'RN-07',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  registrar_costo: {
    requisito: 'RN-07',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
  marcar_pago: {
    requisito: 'RN-07',
    celdas: [noMiembro, noMiembro, noMiembro, noMiembro, noAdmin, si],
  },
};

const columnas: readonly Rol[] = [
  'cuenta_sin_verificar',
  'no_miembro',
  'ex_miembro',
  'expulsado',
  'jugador',
  'admin',
];

describe('RNF-013 y RN-07 — matriz de autorización rol × acción', () => {
  it('la tabla de los tests cubre todos los roles y todas las acciones', () => {
    expect([...roles].sort()).toEqual([...columnas].sort());
    expect(Object.keys(esperada).sort()).toEqual([...acciones].sort());
  });

  for (const accion of acciones) {
    const { requisito, celdas } = esperada[accion];
    describe(`${requisito} — ${accion}`, () => {
      columnas.forEach((rol, i) => {
        const decision = celdas[i];
        const nombre =
          decision === undefined || decision.permitida
            ? `${rol}: permitida`
            : `${rol}: negada (${decision.motivo})`;
        it(nombre, () => {
          expect(decidir(accion, rol)).toEqual(decision);
          expect(autorizar(accion, rol).isOk()).toBe(decision?.permitida);
        });
      });
    });
  }
});

describe('RNF-013 — rol de quien actúa', () => {
  it('una cuenta sin verificar no tiene rol en ningún grupo (RF-004)', () => {
    expect(rolDelActor('sin_verificar', null)).toBe('cuenta_sin_verificar');
    expect(rolDelActor('sin_verificar', { rol: 'admin', salida: null })).toBe(
      'cuenta_sin_verificar',
    );
  });

  it('sin fila en miembro es no_miembro', () => {
    expect(rolDelActor('activa', null)).toBe('no_miembro');
  });

  it('RN-28: el que salió es ex_miembro y el expulsado es expulsado, sin importar su rol', () => {
    expect(rolDelActor('activa', { rol: 'admin', salida: 'salio' })).toBe('ex_miembro');
    expect(rolDelActor('activa', { rol: 'jugador', salida: 'expulsado' })).toBe('expulsado');
  });

  it('un miembro vigente tiene su rol del grupo', () => {
    expect(rolDelActor('activa', { rol: 'jugador', salida: null })).toBe('jugador');
    expect(rolDelActor('activa', { rol: 'admin', salida: null })).toBe('admin');
  });

  it('RN-07: un jugador no tiene ninguna acción de admin; un admin tiene todas', () => {
    expect(accionesPermitidas('jugador')).toEqual([
      'crear_grupo',
      'ver_invitacion',
      'unirse_por_link',
      'ver_grupo',
    ]);
    expect(accionesPermitidas('admin')).toEqual(acciones);
  });

  it('autorizar devuelve el motivo del rechazo', () => {
    expect(autorizar('regenerar_link', 'jugador')._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'NoEsAdmin',
    });
  });
});
