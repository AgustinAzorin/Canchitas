// Logger estructurado (ADR 0015). Nunca se loguean mails, tokens, contraseñas ni fechas de
// nacimiento: estos campos se reemplazan antes de escribir.
import { pino, type Logger } from 'pino';

const camposSensibles = [
  'email',
  'mail',
  'password',
  'contrasena',
  'token',
  'fecha_nacimiento',
  'fechaNacimiento',
];

export const rutasRedactadas = [
  'req.url',
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...camposSensibles,
  ...camposSensibles.map((campo) => `*.${campo}`),
];

const censura = '[redactado]';

/** Rutas con un token en el camino: el link de invitación (RF-011) es una credencial. */
const tokensEnLaUrl = /^(\/v1\/invitaciones\/)[^/?#]+/;

/** La URL se loguea sin tokens; cualquier otro campo sensible, entero. */
export function censurar(valor: unknown, ruta: readonly unknown[]): unknown {
  if (ruta.length === 2 && ruta[0] === 'req' && ruta[1] === 'url' && typeof valor === 'string') {
    return valor.replace(tokensEnLaUrl, `$1${censura}`);
  }
  return censura;
}

export function crearLogger(nivel: string, nombre: string): Logger {
  return pino({
    name: nombre,
    level: nivel,
    redact: { paths: rutasRedactadas, censor: censurar },
  });
}
