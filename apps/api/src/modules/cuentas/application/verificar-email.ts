// RF-004 y RNF-014: el enlace del mail activa la cuenta una sola vez. Better Auth firma el enlace
// como JWT y no lo invalida al usarlo, así que el enlace se da por usado si, cuando se abre, la
// cuenta ya estaba activa (decisión de M1).
import { err, ok, type Result } from '../../../shared/result.ts';
import type { EnlaceInvalido, EnlaceUsado } from '../domain/errores.ts';
import type { ProveedorDeIdentidad, RepositorioDeCuentas } from './puertos.ts';

export type VerificarEmail = (token: string) => Promise<Result<void, EnlaceInvalido | EnlaceUsado>>;

export function crearVerificarEmail(deps: {
  identidad: ProveedorDeIdentidad;
  cuentas: RepositorioDeCuentas;
}): VerificarEmail {
  return async (token) => {
    const email = deps.identidad.emailDelEnlaceDeVerificacion(token);
    const antes = email === null ? null : await deps.cuentas.buscarPorEmail(email);
    // Primero la firma: un enlace falso no revela si una cuenta existe o está activa.
    if (!(await deps.identidad.verificarMail(token))) {
      return err({ tipo: 'EnlaceInvalido' });
    }
    return antes?.estado === 'activa' ? err({ tipo: 'EnlaceUsado' }) : ok(undefined);
  };
}
