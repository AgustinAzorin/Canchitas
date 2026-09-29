// Lecturas de grupos sobre la vista v_grupo (apps/api/CLAUDE.md: las lecturas no pasan por el
// dominio).
import type { Selectable } from 'kysely';

import type { BaseDeDatos } from '../../../shared/db/conexion.ts';
import type { VGrupo } from '../../../shared/db/tipos.generated.ts';
import type { ConsultasDeGrupos, DatosDeGrupo } from '../application/puertos.ts';

/** Las columnas de una vista salen nulables en los tipos generados; en v_grupo nunca lo son. */
function aDatos(fila: Selectable<VGrupo>): DatosDeGrupo {
  const { id, nombre, link_token: linkToken, cantidad_miembros: cantidadMiembros } = fila;
  if (id === null || nombre === null || linkToken === null || cantidadMiembros === null) {
    throw new Error('Fila incompleta en v_grupo');
  }
  return { id, nombre, linkToken, cantidadMiembros };
}

export function crearConsultasDeGrupos(db: BaseDeDatos): ConsultasDeGrupos {
  return {
    async grupo(grupoId) {
      const fila = await db
        .selectFrom('v_grupo')
        .selectAll()
        .where('id', '=', grupoId)
        .executeTakeFirst();
      return fila === undefined ? null : aDatos(fila);
    },

    async grupoDelLink(linkToken) {
      const fila = await db
        .selectFrom('v_grupo')
        .selectAll()
        .where('link_token', '=', linkToken)
        .executeTakeFirst();
      return fila === undefined ? null : aDatos(fila);
    },

    async gruposDe(usuarioId) {
      const filas = await db
        .selectFrom('v_grupo')
        .innerJoin('miembro', 'miembro.grupo_id', 'v_grupo.id')
        .innerJoin('jugador', 'jugador.id', 'miembro.jugador_id')
        .selectAll('v_grupo')
        .select('miembro.rol')
        .where('jugador.usuario_id', '=', usuarioId)
        .where('miembro.salida_en', 'is', null)
        .orderBy('v_grupo.nombre')
        .orderBy('v_grupo.id')
        .execute();
      return filas.map((fila) => {
        const { id, nombre, cantidadMiembros } = aDatos(fila);
        return { id, nombre, cantidadMiembros, rol: fila.rol };
      });
    },
  };
}
