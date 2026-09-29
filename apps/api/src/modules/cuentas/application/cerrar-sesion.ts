// RF-007: cerrar la sesión del dispositivo actual. Borrar la sesión borra en cascada el
// dispositivo registrado con ella, así deja de recibir push (migración de Better Auth).
import { err, ok, type Result } from '../../../shared/result.ts';
import type { SinSesion } from '../domain/errores.ts';
import type { ProveedorDeIdentidad } from './puertos.ts';

export type CerrarSesion = (encabezados: Headers) => Promise<Result<readonly string[], SinSesion>>;

export function crearCerrarSesion(deps: { identidad: ProveedorDeIdentidad }): CerrarSesion {
  return async (encabezados) => {
    if ((await deps.identidad.sesionActual(encabezados)) === null) {
      return err({ tipo: 'SinSesion' });
    }
    return ok(await deps.identidad.cerrarSesion(encabezados));
  };
}
