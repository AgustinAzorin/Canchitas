// Cableado del módulo de grupos (ADR 0004). La sesión la resuelve cuentas; los permisos, el módulo
// de políticas dentro de cada caso de uso.
import { crearConsultarGrupo } from '../modules/grupos/application/consultar-grupo.ts';
import { crearConsultarInvitacion } from '../modules/grupos/application/consultar-invitacion.ts';
import { crearCrearGrupo } from '../modules/grupos/application/crear-grupo.ts';
import { crearListarMisGrupos } from '../modules/grupos/application/listar-mis-grupos.ts';
import { crearRegenerarLink } from '../modules/grupos/application/regenerar-link.ts';
import { crearUnirsePorLink } from '../modules/grupos/application/unirse-por-link.ts';
import type { CasosDeUsoDeGrupos } from '../modules/grupos/http/routes.ts';
import { crearConsultasDeGrupos } from '../modules/grupos/infrastructure/consultas-de-grupos-kysely.ts';
import { generadorDeLinks } from '../modules/grupos/infrastructure/generador-de-links.ts';
import { crearRepositorioDeGrupos } from '../modules/grupos/infrastructure/repositorio-de-grupos-kysely.ts';
import type { CasosDeUsoDeCuentas } from '../modules/cuentas/http/routes.ts';
import type { Autenticar } from '../shared/autenticacion.ts';
import type { Clock } from '../shared/clock.ts';
import type { BaseDeDatos } from '../shared/db/conexion.ts';

/** El actor de la sesión, a partir de la cuenta actual (RF-005, RNF-012). */
export function autenticarConCuentas(cuentas: CasosDeUsoDeCuentas): Autenticar {
  return async (encabezados) => {
    const resultado = await cuentas.consultarCuentaActual(encabezados);
    if (resultado.isErr()) {
      return null;
    }
    const { cuenta, cookies } = resultado.value;
    return { actor: { usuarioId: cuenta.id, cuenta: cuenta.estado }, cookies };
  };
}

export function crearGrupos(deps: { db: BaseDeDatos; clock: Clock }): CasosDeUsoDeGrupos {
  const grupos = crearRepositorioDeGrupos(deps.db);
  const consultas = crearConsultasDeGrupos(deps.db);
  const links = generadorDeLinks;
  const { clock } = deps;
  return {
    crearGrupo: crearCrearGrupo({ grupos, consultas, links, clock }),
    listarMisGrupos: crearListarMisGrupos({ consultas }),
    consultarGrupo: crearConsultarGrupo({ grupos, consultas }),
    regenerarLink: crearRegenerarLink({ grupos, consultas, links, clock }),
    consultarInvitacion: crearConsultarInvitacion({ grupos, consultas }),
    unirsePorLink: crearUnirsePorLink({ grupos, clock }),
  };
}
