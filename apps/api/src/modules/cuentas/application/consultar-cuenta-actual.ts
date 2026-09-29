// La cuenta de quien tiene la sesión: los clientes la usan para saber si hay sesión (RF-005)
// y en qué estado está la cuenta (RF-004). Usarla corre el vencimiento de la sesión (RNF-012).
import { err, ok, type Result } from '../../../shared/result.ts';
import type { SinSesion } from '../domain/errores.ts';
import type { Cuenta, ProveedorDeIdentidad, RepositorioDeCuentas } from './puertos.ts';

export interface CuentaActual {
  cuenta: Cuenta;
  /** `Set-Cookie` de la sesión refrescada, para la web. */
  cookies: readonly string[];
}

export type ConsultarCuentaActual = (
  encabezados: Headers,
) => Promise<Result<CuentaActual, SinSesion>>;

export function crearConsultarCuentaActual(deps: {
  identidad: ProveedorDeIdentidad;
  cuentas: RepositorioDeCuentas;
}): ConsultarCuentaActual {
  return async (encabezados) => {
    const sesion = await deps.identidad.sesionActual(encabezados);
    const cuenta = sesion === null ? null : await deps.cuentas.buscar(sesion.usuarioId);
    return sesion === null || cuenta === null
      ? err({ tipo: 'SinSesion' })
      : ok({ cuenta, cookies: sesion.cookies });
  };
}
