// RF-012: un admin reemplaza el link de invitación por uno nuevo, sin vencimiento. El anterior deja
// de funcionar (RF-011). Un jugador sin rol de admin recibe un rechazo.
import type { Actor } from '../../../shared/autenticacion.ts';
import type { Clock } from '../../../shared/clock.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import type { NoAutorizado } from '../domain/errores.ts';
import { autorizar, rolDelActor } from '../domain/politicas.ts';
import { detalleDeGrupo, type DetalleDeGrupo } from './detalle-de-grupo.ts';
import type { ConsultasDeGrupos, GeneradorDeLinks, RepositorioDeGrupos } from './puertos.ts';

export type RegenerarLink = (
  grupoId: string,
  actor: Actor,
) => Promise<Result<DetalleDeGrupo, NoAutorizado>>;

export function crearRegenerarLink(deps: {
  grupos: RepositorioDeGrupos;
  consultas: ConsultasDeGrupos;
  links: GeneradorDeLinks;
  clock: Clock;
}): RegenerarLink {
  return async (grupoId, actor) => {
    const membresia = await deps.grupos.membresia(grupoId, actor.usuarioId);
    const autorizado = autorizar('regenerar_link', rolDelActor(actor.cuenta, membresia));
    if (autorizado.isErr()) {
      return err(autorizado.error);
    }
    if (membresia === null) {
      // No pasa: solo un admin llega acá. Lo pide el tipo de `membresia`.
      return err({ tipo: 'NoAutorizado', motivo: 'NoEsMiembro' });
    }
    await deps.grupos.cambiarLink(grupoId, deps.links.nuevoToken(), deps.clock.ahora());
    const datos = await deps.consultas.grupo(grupoId);
    if (datos === null) {
      return err({ tipo: 'NoAutorizado', motivo: 'NoEsMiembro' });
    }
    return ok(detalleDeGrupo(datos, membresia.rol));
  };
}
