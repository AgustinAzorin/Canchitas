// Configuración leída del entorno y validada al arrancar. Si falta algo, el proceso no arranca.
import { z } from 'zod';

const Config = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Versión desplegada: el tag o el commit en staging y prod. */
  APP_VERSION: z.string().min(1).default('dev'),
});

const booleano = z.enum(['true', 'false']).transform((v) => v === 'true');

/** Lo que además necesita la API HTTP: auth (ADR 0009) y mails por SMTP (TBD-09). */
const ConfigDeApi = Config.extend({
  /** Firma cookies de sesión y enlaces de los mails. */
  AUTH_SECRETO: z.string().min(32),
  /** Origen público de la API, detrás de Caddy (ej. https://canchitas.app). */
  URL_API: z.url(),
  /** Origen público de la web: los enlaces de los mails la abren. */
  URL_WEB: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PUERTO: z.coerce.number().int().min(1).max(65_535).default(587),
  SMTP_SEGURO: booleano.default(false),
  SMTP_USUARIO: z.string().min(1).optional(),
  SMTP_CONTRASENA: z.string().min(1).optional(),
  MAIL_REMITENTE: z.string().min(3).default('Canchitas <no-responder@canchitas.app>'),
  /** Costo de argon2id (RNF-009). Por defecto, el mínimo que recomienda OWASP. */
  ARGON2_MEMORIA_KIB: z.coerce.number().int().min(8_192).default(19_456),
  ARGON2_PASADAS: z.coerce.number().int().min(1).default(2),
});

export type Config = z.infer<typeof Config>;
export type ConfigDeApi = z.infer<typeof ConfigDeApi>;

export function leerConfig(entorno: NodeJS.ProcessEnv): Config {
  return Config.parse(entorno);
}

export function leerConfigDeApi(entorno: NodeJS.ProcessEnv): ConfigDeApi {
  return ConfigDeApi.parse(entorno);
}
