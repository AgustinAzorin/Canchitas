// RF-011: con el link vigente, un jugador con cuenta activa se une al grupo sin aprobación de un
// admin. Si ya es miembro, no se duplica la membresía. RF-004: sin verificar no se une. RN-28: el
// que salió vuelve como jugador; el expulsado no.
import type { Actor } from '../../../shared/autenticacion.ts';
import type { Clock } from '../../../shared/clock.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import type { LinkInvalido, NoAutorizado } from '../domain/errores.ts';
import { autorizar, rolDelActor } from '../domain/politicas.ts';
import type { RepositorioDeGrupos } from './puertos.ts';

export interface Union {
  grupoId: string;
  yaEraMiembro: boolean;
}

export type UnirsePorLink = (
  linkToken: string,
  actor: Actor,
) => Promise<Result<Union, LinkInvalido | NoAutorizado>>;

export function crearUnirsePorLink(deps: {
  grupos: RepositorioDeGrupos;
  clock: Clock;
}): UnirsePorLink {
  return async (linkToken, actor) => {
    const grupoId = await deps.grupos.grupoDelLink(linkToken);
    if (grupoId === null) {
      return err({ tipo: 'LinkInvalido' });
    }
    const membresia = await deps.grupos.membresia(grupoId, actor.usuarioId);
    const autorizado = autorizar('unirse_por_link', rolDelActor(actor.cuenta, membresia));
    if (autorizado.isErr()) {
      return err(autorizado.error);
    }
    const resultado = await deps.grupos.unir(grupoId, actor.usuarioId, deps.clock.ahora());
    if (resultado === 'expulsado') {
      return err({ tipo: 'NoAutorizado', motivo: 'Expulsado' });
    }
    return ok({ grupoId, yaEraMiembro: resultado === 'ya_era_miembro' });
  };
}
