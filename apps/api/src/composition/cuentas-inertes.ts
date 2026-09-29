// Casos de uso de cuentas que no se ejecutan: para generar el contrato (solo importa la forma de
// las rutas) y para los tests de otras rutas.
import type { CasosDeUsoDeCuentas } from '../modules/cuentas/http/routes.ts';

const noSeUsa = (): never => {
  throw new Error('Caso de uso de cuentas no disponible acá');
};

export const cuentasInertes: CasosDeUsoDeCuentas = {
  registrarCuenta: noSeUsa,
  iniciarSesion: noSeUsa,
  cerrarSesion: noSeUsa,
  consultarCuentaActual: noSeUsa,
  verificarEmail: noSeUsa,
  reenviarVerificacion: noSeUsa,
  pedirRecuperacion: noSeUsa,
  restablecerContrasena: noSeUsa,
};
