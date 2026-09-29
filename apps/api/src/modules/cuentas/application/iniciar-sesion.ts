// RF-005 y RNF-011: inicio de sesión con mail y contraseña, con bloqueo tras intentos fallidos.
import type { Clock } from '../../../shared/clock.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import { bloqueoVigente, registrarFallo } from '../domain/bloqueo.ts';
import type { CredencialesInvalidas, CuentaBloqueada } from '../domain/errores.ts';
import { normalizarEmail } from './hoy-en-argentina.ts';
import type {
  Cuenta,
  ProveedorDeIdentidad,
  RepositorioDeCuentas,
  RepositorioDeIntentos,
  SesionIniciada,
} from './puertos.ts';

export interface SolicitudDeInicio {
  email: string;
  contrasena: string;
}

export type ErrorDeInicio = CredencialesInvalidas | CuentaBloqueada;

export interface Inicio {
  sesion: SesionIniciada;
  cuenta: Cuenta;
}

export type IniciarSesion = (
  solicitud: SolicitudDeInicio,
) => Promise<Result<Inicio, ErrorDeInicio>>;

export function crearIniciarSesion(deps: {
  identidad: ProveedorDeIdentidad;
  cuentas: RepositorioDeCuentas;
  intentos: RepositorioDeIntentos;
  clock: Clock;
}): IniciarSesion {
  return async (solicitud) => {
    const email = normalizarEmail(solicitud.email);
    const ahora = deps.clock.ahora();
    const previos = await deps.intentos.leer(email);
    const bloqueo = bloqueoVigente(previos, ahora);
    if (bloqueo !== null) {
      // Bloqueado: ni se prueba la contraseña.
      return err({ tipo: 'CuentaBloqueada', hasta: bloqueo });
    }

    const sesion = await deps.identidad.iniciarSesion(email, solicitud.contrasena);
    if (sesion === null) {
      const actuales = await deps.intentos.actualizar(email, (i) => registrarFallo(i, ahora));
      const nuevoBloqueo = bloqueoVigente(actuales, ahora);
      return err(
        nuevoBloqueo === null
          ? { tipo: 'CredencialesInvalidas' }
          : { tipo: 'CuentaBloqueada', hasta: nuevoBloqueo },
      );
    }

    if (previos.fallidosConsecutivos > 0 || previos.bloqueadoHasta !== null) {
      await deps.intentos.reiniciar(email);
    }
    const cuenta = await deps.cuentas.buscar(sesion.usuarioId);
    if (cuenta === null) {
      throw new Error('La sesión apunta a una cuenta que no existe');
    }
    return ok({ sesion, cuenta });
  };
}
