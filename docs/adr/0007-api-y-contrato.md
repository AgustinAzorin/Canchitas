# 0007 — API REST con contrato OpenAPI generado

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

Hay dos clientes propios (web y Android), y Android tiene versiones viejas instaladas que no se pueden forzar a actualizar al instante.

## Decisión

- **Fastify** con **zod** (`fastify-type-provider-zod`). El mismo esquema valida la entrada y genera el contrato.
- **OpenAPI 3.1** generado en `contract/openapi.json` y commiteado. CI falla si está desactualizado.
- **oasdiff** en CI: un cambio incompatible sin versión nueva rompe el build.
- **Versionado por ruta:** `/v1/…`. Una versión vieja se mantiene mientras haya apps que la usen.
- **Clientes generados:** `openapi-typescript` + `openapi-fetch` en la web; `openapi-generator` (Retrofit + kotlinx.serialization) en Android. Nadie escribe a mano un cliente HTTP.
- **Convenciones:**
  - recursos en plural y en español: `/v1/grupos/{grupoId}/partidos`;
  - acciones de dominio que no son CRUD como subrecursos en verbo: `POST /v1/partidos/{id}/confirmacion`, `POST /v1/partidos/{id}/baja`;
  - paginación por cursor (`?cursor=&limite=`);
  - fechas en ISO 8601 con zona; importes como enteros en pesos;
  - `Idempotency-Key` obligatorio en los POST que crean o confirman algo;
  - `ETag` / `If-Match` en ediciones concurrentes (resultados, equipos, fichas);
  - `GET /v1/version-minima` para forzar la actualización de Android cuando no queda otra.
- **RNF-002 (menos de 10 s):** los clientes hacen polling de las pantallas activas. No hay websockets.

## Consecuencias

- Descartado GraphQL: con dos clientes propios y contrato generado no aporta y complica caché y permisos.
- Todo endpoint nuevo empieza por su esquema zod.
