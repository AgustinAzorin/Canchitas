// Encabezados de Fastify como `Headers` estándar, para pasarlos a la librería de auth.
import type { IncomingHttpHeaders } from 'node:http';

export function aHeaders(encabezados: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [nombre, valor] of Object.entries(encabezados)) {
    if (Array.isArray(valor)) {
      for (const v of valor) {
        headers.append(nombre, v);
      }
    } else if (valor !== undefined) {
      headers.set(nombre, valor);
    }
  }
  return headers;
}
