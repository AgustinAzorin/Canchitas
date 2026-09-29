// Cableado del módulo de cuentas (ADR 0004, ADR 0009).
import type { Logger } from 'pino';

import { crearCerrarSesion } from '../modules/cuentas/application/cerrar-sesion.ts';
import { crearConsultarCuentaActual } from '../modules/cuentas/application/consultar-cuenta-actual.ts';
import { crearIniciarSesion } from '../modules/cuentas/application/iniciar-sesion.ts';
import { crearPedirRecuperacion } from '../modules/cuentas/application/pedir-recuperacion.ts';
import type { EnviadorDeMails } from '../modules/cuentas/application/puertos.ts';
import { crearReenviarVerificacion } from '../modules/cuentas/application/reenviar-verificacion.ts';
import { crearRegistrarCuenta } from '../modules/cuentas/application/registrar-cuenta.ts';
import { crearRestablecerContrasena } from '../modules/cuentas/application/restablecer-contrasena.ts';
import { crearVerificarEmail } from '../modules/cuentas/application/verificar-email.ts';
import { crearAuth } from '../modules/cuentas/infrastructure/better-auth.ts';
import { crearEnviadorDeMailsSmtp } from '../modules/cuentas/infrastructure/enviador-de-mails-smtp.ts';
import { crearProveedorDeIdentidad } from '../modules/cuentas/infrastructure/proveedor-de-identidad-better-auth.ts';
import { crearRepositorioDeCuentas } from '../modules/cuentas/infrastructure/repositorio-de-cuentas-kysely.ts';
import { crearRepositorioDeIntentos } from '../modules/cuentas/infrastructure/repositorio-de-intentos-kysely.ts';
import type { CasosDeUsoDeCuentas } from '../modules/cuentas/http/routes.ts';
import type { Clock } from '../shared/clock.ts';
import type { ConfigDeApi } from '../shared/config.ts';
import type { BaseDeDatos } from '../shared/db/conexion.ts';

export function crearEnviadorDeMails(config: ConfigDeApi): EnviadorDeMails {
  return crearEnviadorDeMailsSmtp({
    host: config.SMTP_HOST,
    puerto: config.SMTP_PUERTO,
    seguro: config.SMTP_SEGURO,
    usuario: config.SMTP_USUARIO,
    contrasena: config.SMTP_CONTRASENA,
    remitente: config.MAIL_REMITENTE,
  });
}

export function crearCuentas(deps: {
  config: ConfigDeApi;
  db: BaseDeDatos;
  logger: Logger;
  clock: Clock;
  mails: EnviadorDeMails;
}): CasosDeUsoDeCuentas {
  const { config, db, logger, clock } = deps;
  const auth = crearAuth({
    db,
    secreto: config.AUTH_SECRETO,
    urlDeLaApi: config.URL_API,
    urlDeLaWeb: config.URL_WEB,
    mails: deps.mails,
    costo: { memoria: config.ARGON2_MEMORIA_KIB, pasadas: config.ARGON2_PASADAS },
    registrar: (nivel, mensaje) => {
      logger[nivel]({ origen: 'better-auth' }, mensaje);
    },
  });
  const identidad = crearProveedorDeIdentidad(auth);
  const cuentas = crearRepositorioDeCuentas(db);
  const intentos = crearRepositorioDeIntentos(db);

  return {
    registrarCuenta: crearRegistrarCuenta({ identidad, cuentas, clock }),
    iniciarSesion: crearIniciarSesion({ identidad, cuentas, intentos, clock }),
    cerrarSesion: crearCerrarSesion({ identidad }),
    consultarCuentaActual: crearConsultarCuentaActual({ identidad, cuentas }),
    verificarEmail: crearVerificarEmail({ identidad, cuentas }),
    reenviarVerificacion: crearReenviarVerificacion({ identidad }),
    pedirRecuperacion: crearPedirRecuperacion({ identidad }),
    restablecerContrasena: crearRestablecerContrasena({ identidad }),
  };
}
