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
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  ...camposSensibles,
  ...camposSensibles.map((campo) => `*.${campo}`),
];

export function crearLogger(nivel: string, nombre: string): Logger {
  return pino({
    name: nombre,
    level: nivel,
    redact: { paths: rutasRedactadas, censor: '[redactado]' },
  });
}
