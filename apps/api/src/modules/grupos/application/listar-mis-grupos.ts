// Los grupos de quien tiene la sesión, para entrar a cada uno después de crearlo (RF-010) o de
// unirse (RF-011). Solo los grupos donde es miembro vigente.
import type { Actor } from '../../../shared/autenticacion.ts';
import type { ConsultasDeGrupos, ResumenDeGrupo } from './puertos.ts';

export type ListarMisGrupos = (actor: Actor) => Promise<readonly ResumenDeGrupo[]>;

export function crearListarMisGrupos(deps: { consultas: ConsultasDeGrupos }): ListarMisGrupos {
  return (actor) => deps.consultas.gruposDe(actor.usuarioId);
}
