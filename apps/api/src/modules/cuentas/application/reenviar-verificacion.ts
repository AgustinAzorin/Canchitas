// RF-004: reenviar el mail de verificación. Responde igual exista o no la cuenta.
import { normalizarEmail } from './hoy-en-argentina.ts';
import type { ProveedorDeIdentidad } from './puertos.ts';

export type ReenviarVerificacion = (email: string) => Promise<void>;

export function crearReenviarVerificacion(deps: {
  identidad: ProveedorDeIdentidad;
}): ReenviarVerificacion {
  return (email) => deps.identidad.reenviarVerificacion(normalizarEmail(email));
}
