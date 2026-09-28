import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

import { problemas, respuestaProblem, tipoDeContenidoProblem } from '../../shared/http/problem.ts';
import type { ConsultarSalud } from '../application/consultar-salud.ts';

export const Salud = z
  .object({
    estado: z.literal('ok'),
    version: z.string().describe('Versión desplegada de la API'),
    instante: z.iso.datetime({ offset: true }).describe('Hora del servidor'),
  })
  .meta({ id: 'Salud' });

export function rutasDeSalud(consultarSalud: ConsultarSalud): FastifyPluginAsyncZod {
  // eslint-disable-next-line @typescript-eslint/require-await -- Fastify registra plugins async.
  return async (app) => {
    app.get(
      '/v1/salud',
      {
        schema: {
          operationId: 'consultarSalud',
          tags: ['salud'],
          summary: 'Estado de la API',
          description:
            'Responde si la API está en línea y puede consultar la base. Hito M0 de docs/ROADMAP.md; no implementa un requisito del SRS.',
          response: {
            200: {
              description: 'La API y la base responden',
              content: { 'application/json': { schema: Salud } },
            },
            503: { description: 'La base no responde', ...respuestaProblem },
          },
        },
      },
      async (request, reply) => {
        const resultado = await consultarSalud();
        if (resultado.isErr()) {
          return reply
            .code(problemas.servicioNoDisponible.status)
            .type(tipoDeContenidoProblem)
            .send({ ...problemas.servicioNoDisponible, instance: request.url });
        }
        const salud = resultado.value;
        return { ...salud, instante: salud.instante.toISOString() };
      },
    );
  };
}
