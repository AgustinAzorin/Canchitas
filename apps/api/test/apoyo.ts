// Piezas compartidas por los tests de la API.
import { Writable } from 'node:stream';

import { pino, type Logger } from 'pino';

import { censurar, rutasRedactadas } from '../src/shared/logger.ts';

/** Logger que junta las líneas en memoria, con la misma redacción que el de producción. */
export function loggerEnMemoria(): { logger: Logger; lineas: string[] } {
  const lineas: string[] = [];
  const destino = new Writable({
    write(chunk: Buffer, _encoding, listo) {
      lineas.push(chunk.toString());
      listo();
    },
  });
  const logger = pino({ redact: { paths: rutasRedactadas, censor: censurar } }, destino);
  return { logger, lineas };
}
