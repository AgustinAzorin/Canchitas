// Escrituras y membresías de grupos con Kysely (ADR 0005). El usuario juega a través de su fila
// en `jugador`, que se crea la primera vez que entra a un grupo.
import { sql, type Transaction } from 'kysely';

import type { BaseDeDatos } from '../../../shared/db/conexion.ts';
import type { DB } from '../../../shared/db/tipos.generated.ts';
import type { Membresia } from '../domain/politicas.ts';
import type { RepositorioDeGrupos } from '../application/puertos.ts';

async function jugadorDe(tx: Transaction<DB>, usuarioId: string): Promise<string> {
  await tx
    .insertInto('jugador')
    .values({ usuario_id: usuarioId })
    .onConflict((oc) => oc.column('usuario_id').doNothing())
    .execute();
  const fila = await tx
    .selectFrom('jugador')
    .select('id')
    .where('usuario_id', '=', usuarioId)
    .executeTakeFirstOrThrow();
  return fila.id;
}

export function crearRepositorioDeGrupos(db: BaseDeDatos): RepositorioDeGrupos {
  return {
    async membresia(grupoId, usuarioId): Promise<Membresia> {
      const fila = await db
        .selectFrom('miembro')
        .innerJoin('jugador', 'jugador.id', 'miembro.jugador_id')
        .innerJoin('grupo', 'grupo.id', 'miembro.grupo_id')
        .select(['miembro.rol', 'miembro.motivo_salida'])
        .where('miembro.grupo_id', '=', grupoId)
        .where('jugador.usuario_id', '=', usuarioId)
        .where('grupo.borrado_en', 'is', null)
        .executeTakeFirst();
      if (fila === undefined) {
        return null;
      }
      return fila.motivo_salida === null
        ? { rol: fila.rol, salida: null }
        : { rol: fila.rol, salida: fila.motivo_salida };
    },

    crear(grupo, instante) {
      return db.transaction().execute(async (tx) => {
        const jugadorId = await jugadorDe(tx, grupo.creadorUsuarioId);
        const { id } = await tx
          .insertInto('grupo')
          .values({
            nombre: grupo.nombre,
            creador_usuario_id: grupo.creadorUsuarioId,
            link_token: grupo.linkToken,
            creado_en: instante,
          })
          .returning('id')
          .executeTakeFirstOrThrow();
        await tx
          .insertInto('miembro')
          .values({ grupo_id: id, jugador_id: jugadorId, rol: 'admin', unido_en: instante })
          .execute();
        return id;
      });
    },

    async grupoDelLink(linkToken) {
      const fila = await db
        .selectFrom('grupo')
        .select('id')
        .where('link_token', '=', linkToken)
        .where('borrado_en', 'is', null)
        .executeTakeFirst();
      return fila?.id ?? null;
    },

    unir(grupoId, usuarioId, instante) {
      return db.transaction().execute(async (tx) => {
        const jugadorId = await jugadorDe(tx, usuarioId);
        // Nuevo, o de vuelta si había salido (RN-28). Un miembro vigente o un expulsado no cambian.
        const unido = await tx
          .insertInto('miembro')
          .values({ grupo_id: grupoId, jugador_id: jugadorId, rol: 'jugador', unido_en: instante })
          .onConflict((oc) =>
            oc
              .columns(['grupo_id', 'jugador_id'])
              .doUpdateSet({
                rol: 'jugador',
                unido_en: instante,
                salida_en: null,
                motivo_salida: null,
              })
              .where('miembro.motivo_salida', '=', sql.lit('salio')),
          )
          .returning('grupo_id')
          .executeTakeFirst();
        if (unido !== undefined) {
          return 'unido';
        }
        const actual = await tx
          .selectFrom('miembro')
          .select('motivo_salida')
          .where('grupo_id', '=', grupoId)
          .where('jugador_id', '=', jugadorId)
          .executeTakeFirstOrThrow();
        return actual.motivo_salida === 'expulsado' ? 'expulsado' : 'ya_era_miembro';
      });
    },

    async cambiarLink(grupoId, linkToken, instante) {
      await db
        .updateTable('grupo')
        .set({ link_token: linkToken, link_regenerado_en: instante })
        .where('id', '=', grupoId)
        .execute();
    },
  };
}
