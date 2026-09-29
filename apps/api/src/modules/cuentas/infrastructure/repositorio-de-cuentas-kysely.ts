import type { BaseDeDatos } from '../../../shared/db/conexion.ts';
import type { Cuenta, RepositorioDeCuentas } from '../application/puertos.ts';

async function buscarPor(
  db: BaseDeDatos,
  columna: 'id' | 'email',
  valor: string,
): Promise<Cuenta | null> {
  const fila = await db
    .selectFrom('usuario')
    .select(['id', 'email', 'nombre_usuario', 'estado'])
    .where(columna, '=', valor)
    .executeTakeFirst();
  return fila === undefined
    ? null
    : { id: fila.id, email: fila.email, nombreUsuario: fila.nombre_usuario, estado: fila.estado };
}

export function crearRepositorioDeCuentas(db: BaseDeDatos): RepositorioDeCuentas {
  return {
    // email y nombre_usuario son citext: la comparación no distingue mayúsculas.
    async existeEmail(email) {
      const fila = await db
        .selectFrom('usuario')
        .select('id')
        .where('email', '=', email)
        .executeTakeFirst();
      return fila !== undefined;
    },

    async existeNombreDeUsuario(nombreUsuario) {
      const fila = await db
        .selectFrom('usuario')
        .select('id')
        .where('nombre_usuario', '=', nombreUsuario)
        .executeTakeFirst();
      return fila !== undefined;
    },

    buscar: (id) => buscarPor(db, 'id', id),
    buscarPorEmail: (email) => buscarPor(db, 'email', email),
  };
}
