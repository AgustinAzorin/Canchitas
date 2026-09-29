// RF-006 y RNF-014: definir la contraseña nueva con el enlace del mail, una sola vez.
// Restablecerla cierra todas las sesiones abiertas de la cuenta.
import { err, ok, type Result } from '../../../shared/result.ts';
import type { EnlaceInvalido } from '../domain/errores.ts';
import type { ProveedorDeIdentidad } from './puertos.ts';

export interface SolicitudDeRestablecimiento {
  token: string;
  contrasenaNueva: string;
}

export type RestablecerContrasena = (
  solicitud: SolicitudDeRestablecimiento,
) => Promise<Result<void, EnlaceInvalido>>;

export function crearRestablecerContrasena(deps: {
  identidad: ProveedorDeIdentidad;
}): RestablecerContrasena {
  return async ({ token, contrasenaNueva }) =>
    (await deps.identidad.restablecerContrasena(token, contrasenaNueva))
      ? ok(undefined)
      : err({ tipo: 'EnlaceInvalido' });
}
