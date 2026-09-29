// RNF-011: intentos de inicio por SHA-256 del mail (tabla intento_inicio).
import { createHash } from 'node:crypto';

import { sql } from 'kysely';

import type { BaseDeDatos } from '../../../shared/db/conexion.ts';
import type { RepositorioDeIntentos } from '../application/puertos.ts';
import { sinIntentos, type IntentosDeInicio } from '../domain/bloqueo.ts';

function clave(email: string): Buffer {
  return createHash('sha256').update(email.toLowerCase()).digest();
}

function leerCon(db: BaseDeDatos, hash: Buffer): Promise<IntentosDeInicio> {
  return db
    .selectFrom('intento_inicio')
    .select(['fallidos_consecutivos', 'bloqueado_hasta'])
    .where('email_hash', '=', hash)
    .executeTakeFirst()
    .then((fila) =>
      fila === undefined
        ? sinIntentos
        : {
            fallidosConsecutivos: fila.fallidos_consecutivos,
            bloqueadoHasta: fila.bloqueado_hasta,
          },
    );
}

export function crearRepositorioDeIntentos(db: BaseDeDatos): RepositorioDeIntentos {
  return {
    leer: (email) => leerCon(db, clave(email)),

    // Un lock por mail durante la transacción: dos fallos simultáneos cuentan dos, aunque sean
    // los primeros y todavía no haya fila que bloquear.
    actualizar(email, cambio) {
      const hash = clave(email);
      return db.transaction().execute(async (trx) => {
        await sql`SELECT pg_advisory_xact_lock(hashtextextended(${hash.toString('hex')}, 0))`.execute(
          trx,
        );
        const nuevo = cambio(await leerCon(trx, hash));
        if (nuevo.fallidosConsecutivos === 0) {
          await trx.deleteFrom('intento_inicio').where('email_hash', '=', hash).execute();
          return nuevo;
        }
        const valores = {
          fallidos_consecutivos: nuevo.fallidosConsecutivos,
          bloqueado_hasta: nuevo.bloqueadoHasta,
          actualizado_en: new Date(),
        };
        await trx
          .insertInto('intento_inicio')
          .values({ email_hash: hash, ...valores })
          .onConflict((oc) => oc.column('email_hash').doUpdateSet(valores))
          .execute();
        return nuevo;
      });
    },

    async reiniciar(email) {
      await db.deleteFrom('intento_inicio').where('email_hash', '=', clave(email)).execute();
    },
  };
}
