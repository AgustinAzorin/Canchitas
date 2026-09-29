// Rutas de cuentas: RF-001 a RF-007 (ADR 0007, ADR 0009). Traducen HTTP a los casos de uso y
// los errores de dominio a problem+json. La sesión de la web viaja en una cookie HttpOnly,
// Secure y SameSite=Lax; la de Android, en `Authorization: Bearer`.
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { aHeaders } from '../../../shared/http/encabezados.ts';
import {
  respuestaProblem,
  tipoDeContenidoProblem,
  type Problem,
} from '../../../shared/http/problem.ts';
import type { CerrarSesion } from '../application/cerrar-sesion.ts';
import type { ConsultarCuentaActual } from '../application/consultar-cuenta-actual.ts';
import type { ErrorDeInicio, IniciarSesion } from '../application/iniciar-sesion.ts';
import type { PedirRecuperacion } from '../application/pedir-recuperacion.ts';
import type { Cuenta as CuentaDeDominio } from '../application/puertos.ts';
import type { ReenviarVerificacion } from '../application/reenviar-verificacion.ts';
import type { ErrorDeAlta, RegistrarCuenta } from '../application/registrar-cuenta.ts';
import type { RestablecerContrasena } from '../application/restablecer-contrasena.ts';
import type { VerificarEmail } from '../application/verificar-email.ts';
import {
  Cuenta,
  CuentaCreada,
  SesionConToken,
  SolicitudConEmail,
  SolicitudDeAlta,
  SolicitudDeInicio,
  SolicitudDeRestablecimiento,
  SolicitudDeVerificacion,
} from './esquemas.ts';
import { problemasDeCuentas as p } from './problemas.ts';

export interface CasosDeUsoDeCuentas {
  registrarCuenta: RegistrarCuenta;
  iniciarSesion: IniciarSesion;
  cerrarSesion: CerrarSesion;
  consultarCuentaActual: ConsultarCuentaActual;
  verificarEmail: VerificarEmail;
  reenviarVerificacion: ReenviarVerificacion;
  pedirRecuperacion: PedirRecuperacion;
  restablecerContrasena: RestablecerContrasena;
}

const json = <T extends z.ZodType>(description: string, schema: T) =>
  ({ description, content: { 'application/json': { schema } } }) as const;
const problema = (description: string) => ({ description, ...respuestaProblem }) as const;
const sinContenido = (description: string) => z.null().describe(description);

const seguridad = [{ sesionWeb: [] }, { bearer: [] }];

function enviarProblema(request: FastifyRequest, reply: FastifyReply, problem: Problem) {
  return reply
    .code(problem.status)
    .type(tipoDeContenidoProblem)
    .send({ ...problem, instance: request.url });
}

function problemaDeAlta(error: ErrorDeAlta): Problem {
  switch (error.tipo) {
    case 'PrivacidadNoAceptada':
      return p.privacidadNoAceptada;
    case 'NombreDeUsuarioInvalido':
      return p.nombreDeUsuarioInvalido;
    case 'FechaInvalida':
      return p.fechaInvalida;
    case 'MenorDeEdad':
      return p.menorDeEdad;
    case 'EmailEnUso':
      return p.emailEnUso;
    case 'NombreDeUsuarioEnUso':
      return p.nombreDeUsuarioEnUso;
  }
}

function responderErrorDeInicio(
  request: FastifyRequest,
  reply: FastifyReply,
  error: ErrorDeInicio,
  ahora: Date,
) {
  if (error.tipo === 'CredencialesInvalidas') {
    return enviarProblema(request, reply, p.credencialesInvalidas);
  }
  const segundos = Math.max(1, Math.ceil((error.hasta.getTime() - ahora.getTime()) / 1000));
  return enviarProblema(request, reply.header('retry-after', String(segundos)), p.cuentaBloqueada);
}

function aCuenta(cuenta: CuentaDeDominio): z.infer<typeof Cuenta> {
  return {
    id: cuenta.id,
    email: cuenta.email,
    nombreUsuario: cuenta.nombreUsuario,
    estado: cuenta.estado,
  };
}

const erroresDeInicio = {
  401: problema('El mail o la contraseña no son correctos, sin decir cuál (RF-005)'),
  429: problema(
    'Inicio de sesión bloqueado por intentos fallidos (RNF-011). El encabezado Retry-After dice en cuántos segundos termina.',
  ),
} as const;

export function rutasDeCuentas(
  casos: CasosDeUsoDeCuentas,
  reloj: () => Date,
): FastifyPluginAsyncZod {
  // eslint-disable-next-line @typescript-eslint/require-await -- Fastify registra plugins async.
  return async (app) => {
    app.post(
      '/v1/cuentas',
      {
        schema: {
          operationId: 'registrarCuenta',
          tags: ['cuentas'],
          summary: 'Crear una cuenta',
          description:
            'RF-001, RF-002, RF-003, RN-20 y RNF-018. Crea la cuenta en estado "Sin verificar" y manda el mail de verificación (RF-004). No inicia sesión.',
          body: SolicitudDeAlta,
          response: {
            201: json('Cuenta creada sin verificar', CuentaCreada),
            409: problema('El mail (RF-001) o el nombre de usuario (RF-003) ya están en uso'),
            422: problema(
              'Menor de 18 años (RF-002), nombre de usuario o fecha inválidos, o sin aceptar la privacidad (RNF-018)',
            ),
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.registrarCuenta(request.body);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, problemaDeAlta(resultado.error));
        }
        return reply.code(201).send({ ...resultado.value, estado: 'sin_verificar' });
      },
    );

    app.post(
      '/v1/cuentas/sesion',
      {
        schema: {
          operationId: 'iniciarSesion',
          tags: ['cuentas'],
          summary: 'Iniciar sesión en la web',
          description:
            'RF-005 y RNF-011. Deja la sesión en una cookie HttpOnly, Secure y SameSite=Lax (ADR 0009). Para Android se usa iniciarSesionConToken.',
          body: SolicitudDeInicio,
          response: {
            200: json('Sesión iniciada; la cookie viaja en Set-Cookie', Cuenta),
            ...erroresDeInicio,
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.iniciarSesion(request.body);
        if (resultado.isErr()) {
          return responderErrorDeInicio(request, reply, resultado.error, reloj());
        }
        const { sesion, cuenta } = resultado.value;
        return reply.header('set-cookie', [...sesion.cookies]).send(aCuenta(cuenta));
      },
    );

    app.post(
      '/v1/cuentas/sesion/token',
      {
        schema: {
          operationId: 'iniciarSesionConToken',
          tags: ['cuentas'],
          summary: 'Iniciar sesión en Android',
          description:
            'RF-005, RNF-011 y RNF-012. Devuelve un bearer que dura 30 días desde el último uso (ADR 0009). No deja cookie.',
          body: SolicitudDeInicio,
          response: {
            200: json('Sesión iniciada', SesionConToken),
            ...erroresDeInicio,
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.iniciarSesion(request.body);
        if (resultado.isErr()) {
          return responderErrorDeInicio(request, reply, resultado.error, reloj());
        }
        const { sesion, cuenta } = resultado.value;
        return { token: sesion.token, cuenta: aCuenta(cuenta) };
      },
    );

    app.delete(
      '/v1/cuentas/sesion',
      {
        schema: {
          operationId: 'cerrarSesion',
          tags: ['cuentas'],
          summary: 'Cerrar la sesión del dispositivo actual',
          description:
            'RF-007. Borra la sesión (y el dispositivo registrado con ella, que deja de recibir push) y vence la cookie de la web.',
          security: seguridad,
          response: {
            204: sinContenido('Sesión cerrada'),
            401: problema('No hay sesión'),
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.cerrarSesion(aHeaders(request.headers));
        if (resultado.isErr()) {
          return enviarProblema(request, reply, p.sinSesion);
        }
        return reply
          .code(204)
          .header('set-cookie', [...resultado.value])
          .send(null);
      },
    );

    app.get(
      '/v1/cuentas/yo',
      {
        schema: {
          operationId: 'consultarCuentaActual',
          tags: ['cuentas'],
          summary: 'La cuenta de la sesión actual',
          description:
            'RF-004, RF-005 y RNF-012. Dice si hay sesión y si la cuenta está verificada. Usarla corre el vencimiento de la sesión (en la web, con una cookie nueva).',
          security: seguridad,
          response: {
            200: json('Cuenta de la sesión', Cuenta),
            401: problema('No hay sesión'),
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.consultarCuentaActual(aHeaders(request.headers));
        if (resultado.isErr()) {
          return enviarProblema(request, reply, p.sinSesion);
        }
        const { cuenta, cookies } = resultado.value;
        if (cookies.length > 0) {
          void reply.header('set-cookie', [...cookies]);
        }
        return aCuenta(cuenta);
      },
    );

    app.post(
      '/v1/cuentas/verificacion',
      {
        schema: {
          operationId: 'verificarEmail',
          tags: ['cuentas'],
          summary: 'Verificar el mail con el enlace',
          description:
            'RF-004 y RNF-014. Activa la cuenta. El enlace vence a las 24 horas y sirve una sola vez: si la cuenta ya está activa, se rechaza.',
          body: SolicitudDeVerificacion,
          response: {
            204: sinContenido('Cuenta activa'),
            400: problema('El enlace venció o no es válido'),
            410: problema('El enlace ya se usó (RNF-014)'),
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.verificarEmail(request.body.token);
        if (resultado.isErr()) {
          return enviarProblema(
            request,
            reply,
            resultado.error.tipo === 'EnlaceUsado' ? p.enlaceUsado : p.enlaceInvalido,
          );
        }
        return reply.code(204).send(null);
      },
    );

    app.post(
      '/v1/cuentas/verificacion/reenvio',
      {
        schema: {
          operationId: 'reenviarVerificacion',
          tags: ['cuentas'],
          summary: 'Reenviar el mail de verificación',
          description:
            'RF-004. Responde igual exista o no la cuenta, para no revelar cuáles existen.',
          body: SolicitudConEmail,
          response: {
            202: sinContenido('Si la cuenta existe y no está verificada, se manda el mail'),
          },
        },
      },
      async (request, reply) => {
        await casos.reenviarVerificacion(request.body.email);
        return reply.code(202).send(null);
      },
    );

    app.post(
      '/v1/cuentas/recuperacion',
      {
        schema: {
          operationId: 'pedirRecuperacion',
          tags: ['cuentas'],
          summary: 'Pedir el mail para definir una contraseña nueva',
          description: 'RF-006. Responde igual exista o no la cuenta. El enlace vence en 1 hora.',
          body: SolicitudConEmail,
          response: { 202: sinContenido('Si la cuenta existe, se manda el mail') },
        },
      },
      async (request, reply) => {
        await casos.pedirRecuperacion(request.body.email);
        return reply.code(202).send(null);
      },
    );

    app.post(
      '/v1/cuentas/recuperacion/confirmacion',
      {
        schema: {
          operationId: 'restablecerContrasena',
          tags: ['cuentas'],
          summary: 'Definir la contraseña nueva con el enlace',
          description:
            'RF-006 y RNF-014. El enlace sirve una sola vez. Cierra todas las sesiones abiertas de la cuenta.',
          body: SolicitudDeRestablecimiento,
          response: {
            204: sinContenido('Contraseña cambiada'),
            400: problema('El enlace venció, no es válido o ya se usó'),
          },
        },
      },
      async (request, reply) => {
        const resultado = await casos.restablecerContrasena(request.body);
        if (resultado.isErr()) {
          return enviarProblema(request, reply, p.enlaceInvalido);
        }
        return reply.code(204).send(null);
      },
    );
  };
}
