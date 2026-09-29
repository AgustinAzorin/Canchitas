// Casos de uso de grupos con puertos en memoria (ADR 0014). Los permisos salen del módulo de
// políticas: acá se prueba que cada caso de uso lo consulte y respete lo que decide.
import { describe, expect, it } from 'vitest';

import { crearConsultarGrupo } from '../../src/modules/grupos/application/consultar-grupo.ts';
import { crearConsultarInvitacion } from '../../src/modules/grupos/application/consultar-invitacion.ts';
import { crearCrearGrupo } from '../../src/modules/grupos/application/crear-grupo.ts';
import { crearListarMisGrupos } from '../../src/modules/grupos/application/listar-mis-grupos.ts';
import { crearRegenerarLink } from '../../src/modules/grupos/application/regenerar-link.ts';
import { crearUnirsePorLink } from '../../src/modules/grupos/application/unirse-por-link.ts';
import type { Actor } from '../../src/shared/autenticacion.ts';
import { gruposEnMemoria } from './fakes.ts';

const reloj = { ahora: () => new Date('2026-09-29T15:00:00.000Z') };
const ana: Actor = { usuarioId: 'ana', cuenta: 'activa' };
const beto: Actor = { usuarioId: 'beto', cuenta: 'activa' };
const sinVerificar: Actor = { usuarioId: 'caro', cuenta: 'sin_verificar' };

function armar() {
  const memoria = gruposEnMemoria();
  const deps = {
    grupos: memoria.repositorio,
    consultas: memoria.consultas,
    links: memoria.links,
    clock: reloj,
  };
  return {
    memoria,
    crearGrupo: crearCrearGrupo(deps),
    consultarGrupo: crearConsultarGrupo(deps),
    listarMisGrupos: crearListarMisGrupos(deps),
    regenerarLink: crearRegenerarLink(deps),
    consultarInvitacion: crearConsultarInvitacion(deps),
    unirsePorLink: crearUnirsePorLink(deps),
  };
}

async function conGrupo() {
  const casos = armar();
  const grupo = (await casos.crearGrupo({ nombre: 'Los del jueves' }, ana))._unsafeUnwrap();
  const token = grupo.linkToken ?? '';
  return { ...casos, grupo, token };
}

describe('RF-010 — crear un grupo', () => {
  it('el grupo existe, quien lo crea es admin y se genera un link de invitación', async () => {
    const { crearGrupo, memoria } = armar();

    const grupo = (await crearGrupo({ nombre: '  Los   del jueves ' }, ana))._unsafeUnwrap();

    expect(grupo).toEqual({
      id: 'grupo-1',
      nombre: 'Los del jueves',
      cantidadMiembros: 1,
      rol: 'admin',
      linkToken: 'token-1',
      acciones: [
        'ver_link',
        'regenerar_link',
        'crear_votacion',
        'crear_partido',
        'armar_equipos',
        'cargar_resultado',
        'registrar_costo',
        'marcar_pago',
      ],
    });
    expect(memoria.fila('grupo-1', 'ana')).toEqual({ rol: 'admin', salida: null });
  });

  it('una cuenta sin verificar no crea grupos', async () => {
    const { crearGrupo, memoria } = armar();

    const resultado = await crearGrupo({ nombre: 'Los del jueves' }, sinVerificar);

    expect(resultado._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'CuentaSinVerificar',
    });
    expect(memoria.grupos.size).toBe(0);
  });

  it('rechaza un nombre vacío o de más de 60 caracteres', async () => {
    const { crearGrupo, memoria } = armar();

    for (const nombre of ['   ', 'x'.repeat(61)]) {
      expect((await crearGrupo({ nombre }, ana))._unsafeUnwrapErr()).toEqual({
        tipo: 'NombreDeGrupoInvalido',
        largoMaximo: 60,
      });
    }
    expect(memoria.grupos.size).toBe(0);
  });
});

describe('RF-011 — unirse a un grupo por link', () => {
  it('con el link vigente, un jugador pasa a ser miembro sin aprobación de un admin', async () => {
    const { unirsePorLink, consultarGrupo, grupo, token } = await conGrupo();

    const union = await unirsePorLink(token, beto);

    expect(union._unsafeUnwrap()).toEqual({ grupoId: grupo.id, yaEraMiembro: false });
    const visto = (await consultarGrupo(grupo.id, beto))._unsafeUnwrap();
    expect(visto).toMatchObject({ rol: 'jugador', cantidadMiembros: 2 });
  });

  it('un link que no existe informa que no es válido', async () => {
    const { unirsePorLink, consultarInvitacion } = await conGrupo();

    expect((await unirsePorLink('otro', beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'LinkInvalido',
    });
    expect((await consultarInvitacion('otro', beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'LinkInvalido',
    });
  });

  it('el que ya es miembro va al grupo sin duplicar la membresía', async () => {
    const { unirsePorLink, consultarInvitacion, consultarGrupo, grupo, token } = await conGrupo();
    await unirsePorLink(token, beto);

    expect((await consultarInvitacion(token, beto))._unsafeUnwrap().estado).toBe('ya_es_miembro');
    expect((await unirsePorLink(token, beto))._unsafeUnwrap()).toEqual({
      grupoId: grupo.id,
      yaEraMiembro: true,
    });
    expect((await consultarGrupo(grupo.id, ana))._unsafeUnwrap().cantidadMiembros).toBe(2);
  });

  it('RF-004: una cuenta sin verificar no se une y la invitación lo dice', async () => {
    const { unirsePorLink, consultarInvitacion, memoria, grupo, token } = await conGrupo();

    expect((await consultarInvitacion(token, sinVerificar))._unsafeUnwrap().estado).toBe(
      'cuenta_sin_verificar',
    );
    expect((await unirsePorLink(token, sinVerificar))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'CuentaSinVerificar',
    });
    expect(memoria.fila(grupo.id, 'caro')).toBeUndefined();
  });

  it('RN-27: la vista previa muestra nombre y cantidad de miembros', async () => {
    const { consultarInvitacion, grupo, token } = await conGrupo();

    expect((await consultarInvitacion(token, beto))._unsafeUnwrap()).toEqual({
      grupoId: grupo.id,
      nombre: 'Los del jueves',
      cantidadMiembros: 1,
      estado: 'puede_unirse',
    });
  });

  it('RN-28: el que salió vuelve como jugador aunque haya sido admin', async () => {
    const { unirsePorLink, consultarInvitacion, memoria, grupo, token } = await conGrupo();
    memoria.poner(grupo.id, 'beto', { rol: 'admin', salida: 'salio' });

    expect((await consultarInvitacion(token, beto))._unsafeUnwrap().estado).toBe('puede_unirse');
    expect((await unirsePorLink(token, beto))._unsafeUnwrap().yaEraMiembro).toBe(false);
    expect(memoria.fila(grupo.id, 'beto')).toEqual({ rol: 'jugador', salida: null });
  });

  it('RN-28: el expulsado no vuelve por link', async () => {
    const { unirsePorLink, consultarInvitacion, memoria, grupo, token } = await conGrupo();
    memoria.poner(grupo.id, 'beto', { rol: 'jugador', salida: 'expulsado' });

    expect((await consultarInvitacion(token, beto))._unsafeUnwrap().estado).toBe('expulsado');
    expect((await unirsePorLink(token, beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'Expulsado',
    });
    expect(memoria.fila(grupo.id, 'beto')).toEqual({ rol: 'jugador', salida: 'expulsado' });
  });

  it('RN-28: si lo expulsan mientras se une, no entra', async () => {
    const { unirsePorLink, memoria, grupo, token } = await conGrupo();
    memoria.alUnir(() => {
      memoria.poner(grupo.id, 'beto', { rol: 'jugador', salida: 'expulsado' });
    });

    expect((await unirsePorLink(token, beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'Expulsado',
    });
  });
});

describe('RF-012 — regenerar el link de invitación', () => {
  it('el admin lo regenera: el anterior deja de funcionar y el nuevo queda vigente', async () => {
    const { regenerarLink, unirsePorLink, grupo, token } = await conGrupo();

    const nuevo = (await regenerarLink(grupo.id, ana))._unsafeUnwrap();

    expect(nuevo.linkToken).not.toBe(token);
    expect((await unirsePorLink(token, beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'LinkInvalido',
    });
    expect((await unirsePorLink(nuevo.linkToken ?? '', beto)).isOk()).toBe(true);
  });

  it('un jugador que no es admin recibe un rechazo y el link no cambia', async () => {
    const { regenerarLink, unirsePorLink, memoria, grupo, token } = await conGrupo();
    await unirsePorLink(token, beto);

    expect((await regenerarLink(grupo.id, beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'NoEsAdmin',
    });
    expect(memoria.grupos.get(grupo.id)?.linkToken).toBe(token);
  });

  it('alguien de afuera recibe lo mismo que si el grupo no existiera', async () => {
    const { regenerarLink, grupo } = await conGrupo();

    expect((await regenerarLink(grupo.id, beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'NoEsMiembro',
    });
    expect((await regenerarLink('no-existe', beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'NoEsMiembro',
    });
  });
});

describe('RN-26 y RN-07 — lo que ve cada rol del grupo', () => {
  it('un jugador ve el grupo sin el link y sin acciones de admin', async () => {
    const { unirsePorLink, consultarGrupo, grupo, token } = await conGrupo();
    await unirsePorLink(token, beto);

    expect((await consultarGrupo(grupo.id, beto))._unsafeUnwrap()).toMatchObject({
      rol: 'jugador',
      linkToken: null,
      acciones: [],
    });
  });

  it('RNF-013: quien no es miembro no ve el grupo, aunque haya sido miembro', async () => {
    const { consultarGrupo, memoria, grupo } = await conGrupo();
    memoria.poner(grupo.id, 'beto', { rol: 'admin', salida: 'salio' });

    expect((await consultarGrupo(grupo.id, beto))._unsafeUnwrapErr()).toEqual({
      tipo: 'NoAutorizado',
      motivo: 'NoEsMiembro',
    });
  });

  it('mis grupos lista solo los grupos donde es miembro vigente', async () => {
    const { crearGrupo, listarMisGrupos, unirsePorLink, memoria, grupo, token } = await conGrupo();
    await unirsePorLink(token, beto);
    const otro = (await crearGrupo({ nombre: 'Fútbol 11' }, ana))._unsafeUnwrap();
    memoria.poner(otro.id, 'beto', { rol: 'jugador', salida: 'salio' });

    expect(await listarMisGrupos(beto)).toEqual([
      { id: grupo.id, nombre: 'Los del jueves', cantidadMiembros: 2, rol: 'jugador' },
    ]);
  });
});
