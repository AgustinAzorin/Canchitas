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

import { rutasDeCuentas, type CasosDeUsoDeCuentas } from '../modules/cuentas/http/routes.ts';
import { rutasDeGrupos, type CasosDeUsoDeGrupos } from '../modules/grupos/http/routes.ts';
import type { ConsultarSalud } from '../salud/application/consultar-salud.ts';
import type { Autenticar } from '../shared/autenticacion.ts';
import { rutasDeSalud } from '../salud/http/routes.ts';
import type { Clock } from '../shared/clock.ts';
import { registrarManejoDeErrores } from '../shared/http/manejo-de-errores.ts';

export interface DependenciasHttp {
  logger: FastifyBaseLogger;
  consultarSalud: ConsultarSalud;
  cuentas: CasosDeUsoDeCuentas;
  grupos: CasosDeUsoDeGrupos;
  autenticar: Autenticar;
  /** Origen de la web, para armar los links de invitación (RF-011). */
  urlDeLaWeb: string;
  clock: Clock;
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
      components: {
        securitySchemes: {
          sesionWeb: {
            type: 'apiKey',
            in: 'cookie',
            name: '__Secure-canchitas.session_token',
            description: 'Cookie HttpOnly, Secure y SameSite=Lax de la web (ADR 0009)',
          },
          bearer: {
            type: 'http',
            scheme: 'bearer',
            description: 'Token de Android: 30 días desde el último uso (RNF-012)',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
    transformObject: jsonSchemaTransformObject,
  });

  const rutas = app.withTypeProvider<ZodTypeProvider>();
  await rutas.register(rutasDeSalud(deps.consultarSalud));
  await rutas.register(rutasDeCuentas(deps.cuentas, () => deps.clock.ahora()));
  await rutas.register(
    rutasDeGrupos(deps.grupos, { autenticar: deps.autenticar, urlDeLaWeb: deps.urlDeLaWeb }),
  );

  return app;
}
