import { sql } from 'kysely';

import type { BaseDeDatos } from '../../shared/db/conexion.ts';
import type { SondaDeBase } from '../application/consultar-salud.ts';

export function crearSondaDeBase(db: BaseDeDatos): SondaDeBase {
  return {
    responde: async () => {
      try {
        await sql`SELECT 1`.execute(db);
        return true;
      } catch {
        return false;
      }
    },
  };
}
