// Arma la aplicación HTTP con lo que le pasa la raíz de composición (ADR 0004).
import swagger from '@fastify/swagger';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  jsonSchemaTransformObject,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { ConsultarSalud } from '../salud/application/consultar-salud.ts';
import { rutasDeSalud } from '../salud/http/routes.ts';
import { registrarManejoDeErrores } from '../shared/http/manejo-de-errores.ts';

export interface DependenciasHttp {
  logger: FastifyBaseLogger;
  consultarSalud: ConsultarSalud;
}

export async function construirApi(deps: DependenciasHttp): Promise<FastifyInstance> {
  const app = Fastify({ loggerInstance: deps.logger, requestIdHeader: 'x-request-id' });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registrarManejoDeErrores(app);

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Canchitas API',
        version: '1.0.0',
        description: 'Contrato generado desde los esquemas zod (ADR 0007). No se edita a mano.',
      },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  const rutas = app.withTypeProvider<ZodTypeProvider>();
  await rutas.register(rutasDeSalud(deps.consultarSalud));

  return app;
}
