// RF-010: un jugador con cuenta activa crea un grupo con un nombre y queda como su admin. Se genera
// el link de invitación.
import type { Actor } from '../../../shared/autenticacion.ts';
import type { Clock } from '../../../shared/clock.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import type { NoAutorizado, NombreDeGrupoInvalido } from '../domain/errores.ts';
import { normalizarNombreDeGrupo } from '../domain/nombre-de-grupo.ts';
import { autorizar, rolDelActor } from '../domain/politicas.ts';
import { detalleDeGrupo, type DetalleDeGrupo } from './detalle-de-grupo.ts';
import type { ConsultasDeGrupos, GeneradorDeLinks, RepositorioDeGrupos } from './puertos.ts';

export interface SolicitudDeGrupo {
  nombre: string;
}

export type ErrorAlCrearGrupo = NoAutorizado | NombreDeGrupoInvalido;

export type CrearGrupo = (
  solicitud: SolicitudDeGrupo,
  actor: Actor,
) => Promise<Result<DetalleDeGrupo, ErrorAlCrearGrupo>>;

export function crearCrearGrupo(deps: {
  grupos: RepositorioDeGrupos;
  consultas: ConsultasDeGrupos;
  links: GeneradorDeLinks;
  clock: Clock;
}): CrearGrupo {
  return async (solicitud, actor) => {
    const autorizado = autorizar('crear_grupo', rolDelActor(actor.cuenta, null));
    if (autorizado.isErr()) {
      return err(autorizado.error);
    }
    const nombre = normalizarNombreDeGrupo(solicitud.nombre);
    if (nombre.isErr()) {
      return err(nombre.error);
    }
    const grupoId = await deps.grupos.crear(
      {
        nombre: nombre.value,
        creadorUsuarioId: actor.usuarioId,
        linkToken: deps.links.nuevoToken(),
      },
      deps.clock.ahora(),
    );
    const datos = await deps.consultas.grupo(grupoId);
    if (datos === null) {
      throw new Error('El grupo recién creado no aparece en v_grupo');
    }
    return ok(detalleDeGrupo(datos, 'admin'));
  };
}
