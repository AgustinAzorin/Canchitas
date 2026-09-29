// El grupo como lo ve un miembro (RNF-013): los de afuera reciben lo mismo que si no existiera.
import type { Actor } from '../../../shared/autenticacion.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import type { NoAutorizado } from '../domain/errores.ts';
import { autorizar, rolDelActor } from '../domain/politicas.ts';
import { detalleDeGrupo, type DetalleDeGrupo } from './detalle-de-grupo.ts';
import type { ConsultasDeGrupos, RepositorioDeGrupos } from './puertos.ts';

export type ConsultarGrupo = (
  grupoId: string,
  actor: Actor,
) => Promise<Result<DetalleDeGrupo, NoAutorizado>>;

export function crearConsultarGrupo(deps: {
  grupos: RepositorioDeGrupos;
  consultas: ConsultasDeGrupos;
}): ConsultarGrupo {
  return async (grupoId, actor) => {
    const membresia = await deps.grupos.membresia(grupoId, actor.usuarioId);
    const autorizado = autorizar('ver_grupo', rolDelActor(actor.cuenta, membresia));
    if (autorizado.isErr()) {
      return err(autorizado.error);
    }
    const datos = await deps.consultas.grupo(grupoId);
    if (datos === null || membresia === null) {
      return err({ tipo: 'NoAutorizado', motivo: 'NoEsMiembro' });
    }
    return ok(detalleDeGrupo(datos, membresia.rol));
  };
}
