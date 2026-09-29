// Puertos del módulo de cuentas en memoria, para los tests de casos de uso.
import type {
  Cuenta,
  DatosDeAlta,
  ProveedorDeIdentidad,
  RepositorioDeCuentas,
  RepositorioDeIntentos,
} from '../../src/modules/cuentas/application/puertos.ts';
import { sinIntentos, type IntentosDeInicio } from '../../src/modules/cuentas/domain/bloqueo.ts';
import type { Clock } from '../../src/shared/clock.ts';

export function relojFijo(instante: Date): Clock {
  return { ahora: () => instante };
}

interface CuentaEnMemoria extends Cuenta {
  contrasena: string;
}

/**
 * Identidad en memoria. Los tokens de verificación son `token-<mail>`; los de recuperación,
 * de un solo uso, salen de `tokenDeRecuperacion`.
 */
export function identidadEnMemoria() {
  const cuentas = new Map<string, CuentaEnMemoria>();
  const sesiones = new Map<string, string>();
  const recuperaciones = new Map<string, string>();
  const altas: DatosDeAlta[] = [];

  const porEmail = (email: string) =>
    [...cuentas.values()].find((c) => c.email === email.toLowerCase());

  const publica = (cuenta: CuentaEnMemoria | undefined): Cuenta | null =>
    cuenta === undefined
      ? null
      : {
          id: cuenta.id,
          email: cuenta.email,
          nombreUsuario: cuenta.nombreUsuario,
          estado: cuenta.estado,
        };

  const repositorio: RepositorioDeCuentas = {
    existeEmail: (email) => Promise.resolve(porEmail(email) !== undefined),
    existeNombreDeUsuario: (nombre) =>
      Promise.resolve([...cuentas.values()].some((c) => c.nombreUsuario === nombre.toLowerCase())),
    buscar: (id) => Promise.resolve(publica(cuentas.get(id))),
    buscarPorEmail: (email) => Promise.resolve(publica(porEmail(email))),
  };

  function agregar(datos: { email: string; nombreUsuario: string; contrasena?: string }): void {
    const id = `id-${datos.nombreUsuario}`;
    cuentas.set(id, {
      id,
      email: datos.email,
      nombreUsuario: datos.nombreUsuario,
      estado: 'sin_verificar',
      contrasena: datos.contrasena ?? 'sin-contrasena',
    });
  }

  const tokenDe = (encabezados: Headers) =>
    (encabezados.get('authorization') ?? '').replace(/^Bearer /, '');

  const identidad: ProveedorDeIdentidad & {
    cuentas: RepositorioDeCuentas;
    altas: DatosDeAlta[];
    agregar: typeof agregar;
    alCrear: () => void;
    tokenDeRecuperacion(email: string): string;
  } = {
    cuentas: repositorio,
    altas,
    agregar,
    alCrear: () => undefined,
    tokenDeRecuperacion(email) {
      const token = `rec-${String(recuperaciones.size)}`;
      recuperaciones.set(token, email);
      return token;
    },
    crearCuenta(datos) {
      identidad.alCrear();
      if (porEmail(datos.email) !== undefined) {
        return Promise.resolve(false);
      }
      altas.push(datos);
      agregar({
        email: datos.email,
        nombreUsuario: datos.nombreUsuario,
        contrasena: datos.contrasena,
      });
      return Promise.resolve(true);
    },
    iniciarSesion(email, contrasena) {
      const cuenta = porEmail(email);
      if (cuenta?.contrasena !== contrasena) {
        return Promise.resolve(null);
      }
      const token = `sesion-${String(sesiones.size + 1)}`;
      sesiones.set(token, cuenta.id);
      return Promise.resolve({ usuarioId: cuenta.id, token, cookies: [`sesion=${token}`] });
    },
    sesionActual(encabezados) {
      const usuarioId = sesiones.get(tokenDe(encabezados));
      return Promise.resolve(usuarioId === undefined ? null : { usuarioId, cookies: [] });
    },
    cerrarSesion(encabezados) {
      sesiones.delete(tokenDe(encabezados));
      return Promise.resolve(['sesion=; Max-Age=0']);
    },
    emailDelEnlaceDeVerificacion: (token) => (token.startsWith('token-') ? token.slice(6) : null),
    verificarMail(token) {
      const cuenta = porEmail(token.replace(/^token-/, ''));
      if (cuenta === undefined) {
        return Promise.resolve(false);
      }
      cuenta.estado = 'activa';
      return Promise.resolve(true);
    },
    reenviarVerificacion: () => Promise.resolve(),
    pedirRecuperacion: () => Promise.resolve(),
    restablecerContrasena(token, contrasenaNueva) {
      const email = recuperaciones.get(token);
      const cuenta = email === undefined ? undefined : porEmail(email);
      if (cuenta === undefined) {
        return Promise.resolve(false);
      }
      recuperaciones.delete(token);
      cuenta.contrasena = contrasenaNueva;
      return Promise.resolve(true);
    },
  };
  return identidad;
}

export function intentosEnMemoria(): RepositorioDeIntentos {
  const intentos = new Map<string, IntentosDeInicio>();
  return {
    leer: (email) => Promise.resolve(intentos.get(email) ?? sinIntentos),
    actualizar(email, cambio) {
      const nuevo = cambio(intentos.get(email) ?? sinIntentos);
      intentos.set(email, nuevo);
      return Promise.resolve(nuevo);
    },
    reiniciar(email) {
      intentos.delete(email);
      return Promise.resolve();
    },
  };
}
