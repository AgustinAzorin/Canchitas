// RF-006: pedir el mail para definir una contraseña nueva. Responde igual exista o no la cuenta.
import { normalizarEmail } from './hoy-en-argentina.ts';
import type { ProveedorDeIdentidad } from './puertos.ts';

export type PedirRecuperacion = (email: string) => Promise<void>;

export function crearPedirRecuperacion(deps: {
  identidad: ProveedorDeIdentidad;
}): PedirRecuperacion {
  return (email) => deps.identidad.pedirRecuperacion(normalizarEmail(email));
}
