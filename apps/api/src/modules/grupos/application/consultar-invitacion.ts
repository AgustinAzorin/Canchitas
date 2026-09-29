// RF-011 y RN-27: lo que se muestra al abrir el link, antes de aceptar. Solo con sesión: nombre del
// grupo, cantidad de miembros y qué pasa si acepta, según el módulo de políticas.
import type { Actor } from '../../../shared/autenticacion.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import type { LinkInvalido, NoAutorizado } from '../domain/errores.ts';
import { autorizar, decidir, rolDelActor } from '../domain/politicas.ts';
import type { ConsultasDeGrupos, RepositorioDeGrupos } from './puertos.ts';

/**
 * - `puede_unirse`: se une al aceptar.
 * - `ya_es_miembro`: se lo lleva al grupo sin duplicar la membresía (RF-011).
 * - `cuenta_sin_verificar`: tiene que verificar el mail antes (RF-004).
 * - `expulsado`: no puede volver por link (RN-28).
 */
export type EstadoDeInvitacion =
  'puede_unirse' | 'ya_es_miembro' | 'cuenta_sin_verificar' | 'expulsado';

export interface Invitacion {
  grupoId: string;
  nombre: string;
  cantidadMiembros: number;
  estado: EstadoDeInvitacion;
}

export type ConsultarInvitacion = (
  linkToken: string,
  actor: Actor,
) => Promise<Result<Invitacion, LinkInvalido | NoAutorizado>>;

export function crearConsultarInvitacion(deps: {
  grupos: RepositorioDeGrupos;
  consultas: ConsultasDeGrupos;
}): ConsultarInvitacion {
  return async (linkToken, actor) => {
    const datos = await deps.consultas.grupoDelLink(linkToken);
    if (datos === null) {
      return err({ tipo: 'LinkInvalido' });
    }
    const rol = rolDelActor(actor.cuenta, await deps.grupos.membresia(datos.id, actor.usuarioId));
    const autorizado = autorizar('ver_invitacion', rol);
    if (autorizado.isErr()) {
      return err(autorizado.error);
    }
    return ok({
      grupoId: datos.id,
      nombre: datos.nombre,
      cantidadMiembros: datos.cantidadMiembros,
      estado: estadoDeInvitacion(rol),
    });
  };
}

function estadoDeInvitacion(rol: ReturnType<typeof rolDelActor>): EstadoDeInvitacion {
  if (rol === 'jugador' || rol === 'admin') {
    return 'ya_es_miembro';
  }
  const decision = decidir('unirse_por_link', rol);
  if (decision.permitida) {
    return 'puede_unirse';
  }
  return decision.motivo === 'CuentaSinVerificar' ? 'cuenta_sin_verificar' : 'expulsado';
}
