// Tokens de los links de invitación (RF-011, RF-012): 128 bits al azar en base64url, 22 caracteres.
import { randomBytes } from 'node:crypto';

import type { GeneradorDeLinks } from '../application/puertos.ts';

export const generadorDeLinks: GeneradorDeLinks = {
  nuevoToken: () => randomBytes(16).toString('base64url'),
};
