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

export type Config = z.infer<typeof Config>;

export function leerConfig(entorno: NodeJS.ProcessEnv): Config {
  return Config.parse(entorno);
}
