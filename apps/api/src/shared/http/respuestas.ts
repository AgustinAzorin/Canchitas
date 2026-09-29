// Piezas para declarar respuestas en las rutas y mandar problem+json (ADR 0007, ADR 0008).
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { respuestaProblem, tipoDeContenidoProblem, type Problem } from './problem.ts';

export const json = <T extends z.ZodType>(description: string, schema: T) =>
  ({ description, content: { 'application/json': { schema } } }) as const;

export const problema = (description: string) => ({ description, ...respuestaProblem }) as const;

export const sinContenido = (description: string) => z.null().describe(description);

/** Web con cookie o Android con bearer (ADR 0009). */
export const seguridad = [{ sesionWeb: [] }, { bearer: [] }];

export function enviarProblema(request: FastifyRequest, reply: FastifyReply, problem: Problem) {
  return reply
    .code(problem.status)
    .type(tipoDeContenidoProblem)
    .send({ ...problem, instance: request.url });
}
