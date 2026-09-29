// RF-001, RF-002, RF-003, RN-20 y RNF-018: alta con mail, contraseña, nombre de usuario y fecha
// de nacimiento. La cuenta queda "Sin verificar" y se manda el mail de verificación (RF-004).
import type { Clock } from '../../../shared/clock.ts';
import { err, ok, type Result } from '../../../shared/result.ts';
import { cumpleEdadMinima, edadMinima } from '../domain/edad.ts';
import type {
  EmailEnUso,
  FechaInvalida,
  MenorDeEdad,
  NombreDeUsuarioEnUso,
  NombreDeUsuarioInvalido,
  PrivacidadNoAceptada,
} from '../domain/errores.ts';
import { leerFechaCalendario } from '../domain/fecha-calendario.ts';
import { normalizarNombreDeUsuario } from '../domain/nombre-de-usuario.ts';
import { fechaEnArgentina, normalizarEmail } from './hoy-en-argentina.ts';
import type { ProveedorDeIdentidad, RepositorioDeCuentas } from './puertos.ts';

export interface SolicitudDeAlta {
  email: string;
  contrasena: string;
  nombreUsuario: string;
  /** AAAA-MM-DD */
  fechaNacimiento: string;
  aceptaPrivacidad: boolean;
}

export type ErrorDeAlta =
  | PrivacidadNoAceptada
  | NombreDeUsuarioInvalido
  | FechaInvalida
  | MenorDeEdad
  | EmailEnUso
  | NombreDeUsuarioEnUso;

export interface CuentaCreada {
  email: string;
  nombreUsuario: string;
}

export type RegistrarCuenta = (
  solicitud: SolicitudDeAlta,
) => Promise<Result<CuentaCreada, ErrorDeAlta>>;

export function crearRegistrarCuenta(deps: {
  identidad: ProveedorDeIdentidad;
  cuentas: RepositorioDeCuentas;
  clock: Clock;
}): RegistrarCuenta {
  return async (solicitud) => {
    if (!solicitud.aceptaPrivacidad) {
      return err({ tipo: 'PrivacidadNoAceptada' });
    }
    const nombreUsuario = normalizarNombreDeUsuario(solicitud.nombreUsuario);
    if (nombreUsuario.isErr()) {
      return err(nombreUsuario.error);
    }
    const nacimiento = leerFechaCalendario(solicitud.fechaNacimiento);
    if (nacimiento.isErr()) {
      return err(nacimiento.error);
    }
    const ahora = deps.clock.ahora();
    if (!cumpleEdadMinima(nacimiento.value, fechaEnArgentina(ahora))) {
      return err({ tipo: 'MenorDeEdad', edadMinima });
    }

    const email = normalizarEmail(solicitud.email);
    const enUso = await buscarEnUso(deps.cuentas, email, nombreUsuario.value);
    if (enUso !== null) {
      return err(enUso);
    }

    const creada = await deps.identidad.crearCuenta({
      email,
      contrasena: solicitud.contrasena,
      nombreUsuario: nombreUsuario.value,
      fechaNacimiento: solicitud.fechaNacimiento,
      privacidadAceptadaEn: ahora,
    });
    if (!creada) {
      // Otra alta ganó la carrera por el mismo mail o nombre de usuario (UNIQUE de la base).
      const ganada = await buscarEnUso(deps.cuentas, email, nombreUsuario.value);
      if (ganada !== null) {
        return err(ganada);
      }
      throw new Error('No se pudo crear la cuenta');
    }
    return ok({ email, nombreUsuario: nombreUsuario.value });
  };
}

async function buscarEnUso(
  cuentas: RepositorioDeCuentas,
  email: string,
  nombreUsuario: string,
): Promise<EmailEnUso | NombreDeUsuarioEnUso | null> {
  if (await cuentas.existeEmail(email)) {
    return { tipo: 'EmailEnUso' };
  }
  if (await cuentas.existeNombreDeUsuario(nombreUsuario)) {
    return { tipo: 'NombreDeUsuarioEnUso' };
  }
  return null;
}
