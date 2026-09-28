// Conexión a Postgres con Kysely (ADR 0005). Los tipos salen de la base real (kysely-codegen).
import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

import type { DB } from './tipos.generated.ts';

export type BaseDeDatos = Kysely<DB>;

export function conectar(url: string): BaseDeDatos {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url, max: 10 }) }),
  });
}
