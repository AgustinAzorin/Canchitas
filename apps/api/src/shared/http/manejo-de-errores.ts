// Toda respuesta de error sale como problem+json (ADR 0008). Un error inesperado se loguea
// completo y al cliente le llega solo el `type` genérico, nunca un mensaje interno.
import type { FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

import { problemas, tipoDeContenidoProblem, type Problem } from './problem.ts';

export function registrarManejoDeErrores(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      const problema: Problem = {
        ...problemas.solicitudInvalida,
        instance: request.url,
        errores: error.validation.map((v) => ({
          campo: v.instancePath.replace(/^\//, '').replaceAll('/', '.'),
          mensaje: v.message ?? '',
        })),
      };
      return reply.code(problema.status).type(tipoDeContenidoProblem).send(problema);
    }
    request.log.error({ err: error }, 'error inesperado');
    const problema: Problem = { ...problemas.interno, instance: request.url };
    return reply.code(problema.status).type(tipoDeContenidoProblem).send(problema);
  });

  app.setNotFoundHandler((request, reply) => {
    const problema: Problem = { ...problemas.noEncontrado, instance: request.url };
    return reply.code(problema.status).type(tipoDeContenidoProblem).send(problema);
  });
}
