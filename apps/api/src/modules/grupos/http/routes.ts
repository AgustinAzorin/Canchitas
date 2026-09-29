// Rutas de grupos: RF-010, RF-011, RF-012 (ADR 0007). Validan, autentican, llaman al caso de uso
// y traducen el resultado. No deciden permisos: eso lo hace el módulo de políticas dentro de cada
// caso de uso (RNF-013).
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { z } from 'zod';

import type { Actor, Autenticar } from '../../../shared/autenticacion.ts';
import { aHeaders } from '../../../shared/http/encabezados.ts';
import { problemas, type Problem } from '../../../shared/http/problem.ts';
import { enviarProblema, json, problema, seguridad } from '../../../shared/http/respuestas.ts';
import type { ConsultarGrupo } from '../application/consultar-grupo.ts';
import type { ConsultarInvitacion } from '../application/consultar-invitacion.ts';
import type { CrearGrupo, ErrorAlCrearGrupo } from '../application/crear-grupo.ts';
import type { DetalleDeGrupo } from '../application/detalle-de-grupo.ts';
import type { LinkInvalido, NoAutorizado } from '../application/errores.ts';
import type { ListarMisGrupos } from '../application/listar-mis-grupos.ts';
import type { RegenerarLink } from '../application/regenerar-link.ts';
import type { UnirsePorLink } from '../application/unirse-por-link.ts';
import {
  Grupo,
  Invitacion,
  ListaDeGrupos,
  ParametrosDeGrupo,
  ParametrosDeInvitacion,
  SolicitudDeGrupo,
  Union,
} from './esquemas.ts';
import { problemasDeGrupos as p } from './problemas.ts';

export interface CasosDeUsoDeGrupos {
  crearGrupo: CrearGrupo;
  listarMisGrupos: ListarMisGrupos;
  consultarGrupo: ConsultarGrupo;
  regenerarLink: RegenerarLink;
  consultarInvitacion: ConsultarInvitacion;
  unirsePorLink: UnirsePorLink;
}

export interface OpcionesDeGrupos {
  autenticar: Autenticar;
  /** Origen de la web: el link de invitación es `<urlDeLaWeb>/i/<token>` (RF-011). */
  urlDeLaWeb: string;
}

function problemaDeRechazo(error: NoAutorizado | LinkInvalido): Problem {
  if (error.tipo === 'LinkInvalido') {
    return p.linkInvalido;
  }
  switch (error.motivo) {
    case 'CuentaSinVerificar':
      return p.cuentaSinVerificar;
    case 'NoEsMiembro':
      return p.grupoNoEncontrado;
    case 'NoEsAdmin':
      return p.requiereAdmin;
    case 'Expulsado':
      return p.expulsado;
  }
}

function problemaAlCrear(error: ErrorAlCrearGrupo): Problem {
  return error.tipo === 'NombreDeGrupoInvalido'
    ? p.nombreDeGrupoInvalido
    : problemaDeRechazo(error);
}

const sinSesion = problema('No hay sesión');

export function rutasDeGrupos(
  casos: CasosDeUsoDeGrupos,
  opciones: OpcionesDeGrupos,
): FastifyPluginAsyncZod {
  const linkDe = (token: string): string =>
    new URL(`/i/${encodeURIComponent(token)}`, opciones.urlDeLaWeb).toString();

  const aGrupo = (detalle: DetalleDeGrupo): z.infer<typeof Grupo> => ({
    id: detalle.id,
    nombre: detalle.nombre,
    cantidadMiembros: detalle.cantidadMiembros,
    rol: detalle.rol,
    link: detalle.linkToken === null ? null : linkDe(detalle.linkToken),
    acciones: [...detalle.acciones],
  });

  /** El actor de la sesión, o `null` después de responder 401. Refresca la cookie de la web. */
  async function actorDe(request: FastifyRequest, reply: FastifyReply): Promise<Actor | null> {
    const sesion = await opciones.autenticar(aHeaders(request.headers));
    if (sesion === null) {
      await enviarProblema(request, reply, problemas.sinSesion);
      return null;
    }
    if (sesion.cookies.length > 0) {
      void reply.header('set-cookie', [...sesion.cookies]);
    }
    return sesion.actor;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- Fastify registra plugins async.
  return async (app) => {
    app.post(
      '/v1/grupos',
      {
        schema: {
          operationId: 'crearGrupo',
          tags: ['grupos'],
          summary: 'Crear un grupo',
          description:
            'RF-010. Quien lo crea queda como admin y se genera el link de invitación. Requiere la cuenta verificada (RF-004).',
          security: seguridad,
          body: SolicitudDeGrupo,
          response: {
            201: json('Grupo creado', Grupo),
            401: sinSesion,
            403: problema('La cuenta no está verificada (RF-004)'),
            422: problema('El nombre no tiene entre 1 y 60 caracteres'),
          },
        },
      },
      async (request, reply) => {
        const actor = await actorDe(request, reply);
        if (actor === null) {
          return reply;
        }
        const resultado = await casos.crearGrupo(request.body, actor);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, problemaAlCrear(resultado.error));
        }
        return reply
          .code(201)
          .header('location', `/v1/grupos/${resultado.value.id}`)
          .send(aGrupo(resultado.value));
      },
    );

    app.get(
      '/v1/grupos',
      {
        schema: {
          operationId: 'listarMisGrupos',
          tags: ['grupos'],
          summary: 'Mis grupos',
          description:
            'RF-010 y RF-011. Los grupos donde quien tiene la sesión es miembro, ordenados por nombre.',
          security: seguridad,
          response: { 200: json('Grupos del usuario', ListaDeGrupos), 401: sinSesion },
        },
      },
      async (request, reply) => {
        const actor = await actorDe(request, reply);
        if (actor === null) {
          return reply;
        }
        return { grupos: [...(await casos.listarMisGrupos(actor))] };
      },
    );

    app.get(
      '/v1/grupos/:grupoId',
      {
        schema: {
          operationId: 'consultarGrupo',
          tags: ['grupos'],
          summary: 'Un grupo',
          description:
            'RNF-013, RN-07 y RN-26. Solo para miembros; a los demás se les responde como si no existiera. El link viene solo para admins y `acciones` dice qué puede hacer el rol.',
          security: seguridad,
          params: ParametrosDeGrupo,
          response: {
            200: json('Grupo', Grupo),
            401: sinSesion,
            404: problema('El grupo no existe o no es miembro'),
          },
        },
      },
      async (request, reply) => {
        const actor = await actorDe(request, reply);
        if (actor === null) {
          return reply;
        }
        const resultado = await casos.consultarGrupo(request.params.grupoId, actor);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, problemaDeRechazo(resultado.error));
        }
        return aGrupo(resultado.value);
      },
    );

    app.post(
      '/v1/grupos/:grupoId/link/regeneracion',
      {
        schema: {
          operationId: 'regenerarLink',
          tags: ['grupos'],
          summary: 'Regenerar el link de invitación',
          description:
            'RF-012. Solo un admin. El link anterior deja de funcionar y el nuevo queda vigente sin vencimiento. Devuelve el grupo con el link nuevo.',
          security: seguridad,
          params: ParametrosDeGrupo,
          response: {
            200: json('Grupo con el link nuevo', Grupo),
            401: sinSesion,
            403: problema('No es admin del grupo (RF-012, RN-07)'),
            404: problema('El grupo no existe o no es miembro'),
          },
        },
      },
      async (request, reply) => {
        const actor = await actorDe(request, reply);
        if (actor === null) {
          return reply;
        }
        const resultado = await casos.regenerarLink(request.params.grupoId, actor);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, problemaDeRechazo(resultado.error));
        }
        return aGrupo(resultado.value);
      },
    );

    app.get(
      '/v1/invitaciones/:token',
      {
        schema: {
          operationId: 'consultarInvitacion',
          tags: ['grupos'],
          summary: 'Ver un link de invitación antes de aceptarlo',
          description:
            'RF-011 y RN-27. Solo con sesión: nombre del grupo, cantidad de miembros y qué pasa si acepta.',
          security: seguridad,
          params: ParametrosDeInvitacion,
          response: {
            200: json('Invitación vigente', Invitacion),
            401: sinSesion,
            404: problema('El link no existe o se regeneró (RF-011)'),
          },
        },
      },
      async (request, reply) => {
        const actor = await actorDe(request, reply);
        if (actor === null) {
          return reply;
        }
        const resultado = await casos.consultarInvitacion(request.params.token, actor);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, problemaDeRechazo(resultado.error));
        }
        return resultado.value;
      },
    );

    app.post(
      '/v1/invitaciones/:token/aceptacion',
      {
        schema: {
          operationId: 'unirsePorLink',
          tags: ['grupos'],
          summary: 'Unirse a un grupo con el link',
          description:
            'RF-011, RF-004 y RN-28. Sin aprobación de un admin. Si ya es miembro, no duplica la membresía. Quien había salido vuelve como jugador; el expulsado no.',
          security: seguridad,
          params: ParametrosDeInvitacion,
          response: {
            200: json('Es miembro del grupo', Union),
            401: sinSesion,
            403: problema('Cuenta sin verificar (RF-004) o expulsado del grupo (RN-28)'),
            404: problema('El link no existe o se regeneró (RF-011)'),
          },
        },
      },
      async (request, reply) => {
        const actor = await actorDe(request, reply);
        if (actor === null) {
          return reply;
        }
        const resultado = await casos.unirsePorLink(request.params.token, actor);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, problemaDeRechazo(resultado.error));
        }
        return resultado.value;
      },
    );
  };
}
