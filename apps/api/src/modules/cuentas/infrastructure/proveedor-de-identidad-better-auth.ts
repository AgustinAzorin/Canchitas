// Adaptador de ProveedorDeIdentidad sobre la API de servidor de Better Auth (ADR 0009).
import { APIError } from 'better-auth/api';

import type { DatosDeAlta, ProveedorDeIdentidad, SesionIniciada } from '../application/puertos.ts';
import type { Auth } from './better-auth.ts';

function esErrorDeCliente(error: unknown): error is APIError {
  return error instanceof APIError && error.statusCode >= 400 && error.statusCode < 500;
}

export function crearProveedorDeIdentidad(auth: Auth): ProveedorDeIdentidad {
  return {
    async crearCuenta(datos: DatosDeAlta) {
      try {
        await auth.api.signUpEmail({
          body: {
            email: datos.email,
            password: datos.contrasena,
            name: datos.nombreUsuario,
            fechaNacimiento: datos.fechaNacimiento,
            privacidadAceptadaEn: datos.privacidadAceptadaEn,
          },
        });
        return true;
      } catch (error) {
        // FAILED_TO_CREATE_USER: la base rechazó el alta (UNIQUE o CHECK de `usuario`).
        if (esErrorDeCliente(error)) {
          return false;
        }
        throw error;
      }
    },

    async iniciarSesion(email, contrasena): Promise<SesionIniciada | null> {
      try {
        const { headers, response } = await auth.api.signInEmail({
          body: { email, password: contrasena },
          returnHeaders: true,
        });
        return {
          usuarioId: response.user.id,
          token: response.token,
          cookies: headers.getSetCookie(),
        };
      } catch (error) {
        if (esErrorDeCliente(error) && error.statusCode === 401) {
          return null;
        }
        throw error;
      }
    },

    async sesionActual(encabezados) {
      const { headers, response } = await auth.api.getSession({
        headers: encabezados,
        returnHeaders: true,
      });
      return response === null
        ? null
        : { usuarioId: response.user.id, cookies: headers.getSetCookie() };
    },

    async cerrarSesion(encabezados) {
      const { headers } = await auth.api.signOut({ headers: encabezados, returnHeaders: true });
      return headers.getSetCookie();
    },

    emailDelEnlaceDeVerificacion(token) {
      const payload = token.split('.')[1];
      if (payload === undefined) {
        return null;
      }
      try {
        const datos: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const email: unknown =
          typeof datos === 'object' && datos !== null ? Reflect.get(datos, 'email') : undefined;
        return typeof email === 'string' ? email : null;
      } catch {
        return null;
      }
    },

    async verificarMail(token) {
      try {
        await auth.api.verifyEmail({ query: { token } });
        return true;
      } catch (error) {
        if (esErrorDeCliente(error)) {
          return false;
        }
        throw error;
      }
    },

    async reenviarVerificacion(email) {
      try {
        await auth.api.sendVerificationEmail({ body: { email } });
      } catch (error) {
        // Cuenta ya verificada: se responde igual, sin revelar nada.
        if (!esErrorDeCliente(error)) {
          throw error;
        }
      }
    },

    async pedirRecuperacion(email) {
      await auth.api.requestPasswordReset({ body: { email } });
    },

    async restablecerContrasena(token, contrasenaNueva) {
      try {
        await auth.api.resetPassword({ body: { token, newPassword: contrasenaNueva } });
        return true;
      } catch (error) {
        if (esErrorDeCliente(error)) {
          return false;
        }
        throw error;
      }
    },
  };
}
