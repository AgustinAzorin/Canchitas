// Better Auth (ADR 0009), usado como librería dentro de la API: sus rutas no se montan. Los
// clientes usan /v1/cuentas/*, que valida con zod, aplica las reglas del SRS y sale en el
// contrato (ADR 0007). Su usuario es la tabla `usuario`; sus tablas de sesión, credencial y
// verificación están en db/migrations/20260929133313_better_auth.sql.
import { betterAuth } from 'better-auth';
import { bearer } from 'better-auth/plugins/bearer';
import type { Kysely } from 'kysely';

import type { DB } from '../../../shared/db/tipos.generated.ts';
import type { EnviadorDeMails } from '../application/puertos.ts';
import { largoDeContrasena } from '../domain/contrasena.ts';
import { crearHashArgon2, type CostoArgon2 } from './hash-argon2.ts';

const hora = 60 * 60;
const dia = 24 * hora;

export const duraciones = {
  /** RNF-012: 30 días desde el último uso (también en la web, decisión de M1). */
  sesion: 30 * dia,
  /** Cada cuánto se corre el vencimiento de la sesión cuando se usa. */
  refrescoDeSesion: hora,
  /** Enlace de verificación del mail (decisión de M1). */
  verificacion: dia,
  /** Enlace de recuperación de contraseña (decisión de M1). */
  recuperacion: hora,
} as const;

export type NivelDeLog = 'debug' | 'info' | 'warn' | 'error';

export interface OpcionesDeAuth {
  db: Kysely<DB>;
  /** Firma cookies y enlaces. Al menos 32 caracteres. */
  secreto: string;
  urlDeLaApi: string;
  /** Los enlaces de los mails abren la web, también desde Android. */
  urlDeLaWeb: string;
  mails: EnviadorDeMails;
  costo: CostoArgon2;
  /** Recibe mensajes ya sin mails. */
  registrar(nivel: NivelDeLog, mensaje: string): void;
}

const patronDeEmail = /[^\s@]+@[^\s@]+/g;

/** Better Auth pone mails en algunos mensajes de log: se borran antes de escribir (RNF-017, ADR 0015). */
export function sinEmails(texto: string): string {
  return texto.replace(patronDeEmail, '[redactado]');
}

function describir(arg: unknown): string {
  if (arg instanceof Error) {
    const codigo = 'code' in arg && typeof arg.code === 'string' ? ` (${arg.code})` : '';
    return `${arg.name}${codigo}`;
  }
  return '';
}

export function crearAuth(o: OpcionesDeAuth) {
  const enlace = (ruta: string, token: string) =>
    `${o.urlDeLaWeb}${ruta}#token=${encodeURIComponent(token)}`;

  return betterAuth({
    appName: 'Canchitas',
    baseURL: o.urlDeLaApi,
    secret: o.secreto,
    trustedOrigins: [o.urlDeLaWeb],
    telemetry: { enabled: false },
    database: { db: o.db, type: 'postgres', transaction: true },
    logger: {
      level: 'warn',
      log: (nivel, mensaje, ...args: unknown[]) => {
        const detalle = args.map(describir).filter(Boolean).join(' ');
        o.registrar(nivel, sinEmails(detalle === '' ? mensaje : `${mensaje}: ${detalle}`));
      },
    },
    user: {
      modelName: 'usuario',
      fields: {
        name: 'nombre_usuario',
        email: 'email',
        emailVerified: 'email_verificado',
        image: 'imagen',
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
      },
      additionalFields: {
        fechaNacimiento: {
          type: 'string',
          fieldName: 'fecha_nacimiento',
          required: true,
          input: true,
          returned: false,
        },
        privacidadAceptadaEn: {
          type: 'date',
          fieldName: 'privacidad_aceptada_en',
          required: true,
          input: true,
          returned: false,
        },
      },
    },
    session: {
      modelName: 'sesion',
      fields: {
        userId: 'usuario_id',
        token: 'token',
        expiresAt: 'expira_en',
        ipAddress: 'ip',
        userAgent: 'agente',
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
      },
      expiresIn: duraciones.sesion,
      updateAge: duraciones.refrescoDeSesion,
    },
    account: {
      modelName: 'credencial',
      fields: {
        userId: 'usuario_id',
        accountId: 'cuenta_id',
        providerId: 'proveedor_id',
        password: 'contrasena_hash',
        accessToken: 'token_acceso',
        refreshToken: 'token_refresco',
        idToken: 'token_id',
        accessTokenExpiresAt: 'token_acceso_expira_en',
        refreshTokenExpiresAt: 'token_refresco_expira_en',
        scope: 'alcance',
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
      },
    },
    verification: {
      modelName: 'verificacion',
      fields: {
        identifier: 'identificador',
        value: 'valor',
        expiresAt: 'expira_en',
        createdAt: 'creado_en',
        updatedAt: 'actualizado_en',
      },
    },
    emailAndPassword: {
      enabled: true,
      // Tras el alta no se inicia sesión: la persona entra con su mail y contraseña.
      autoSignIn: false,
      minPasswordLength: largoDeContrasena.minimo,
      maxPasswordLength: largoDeContrasena.maximo,
      password: crearHashArgon2(o.costo),
      resetPasswordTokenExpiresIn: duraciones.recuperacion,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: ({ user, token }) =>
        o.mails.enviarRecuperacion(user.email, enlace('/recuperar/nueva', token)),
    },
    emailVerification: {
      sendOnSignUp: true,
      expiresIn: duraciones.verificacion,
      sendVerificationEmail: ({ user, token }) =>
        o.mails.enviarVerificacion(user.email, enlace('/verificar', token)),
    },
    advanced: {
      cookiePrefix: 'canchitas',
      useSecureCookies: true,
      defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: 'lax' },
      database: { generateId: 'uuid' },
      // Los mails salen en segundo plano: el tiempo de respuesta no revela si la cuenta existe.
      backgroundTasks: {
        handler: (tarea) => {
          tarea.catch((error: unknown) => {
            o.registrar('error', `falló una tarea en segundo plano: ${describir(error)}`);
          });
        },
      },
    },
    plugins: [bearer()],
  });
}

export type Auth = ReturnType<typeof crearAuth>;
