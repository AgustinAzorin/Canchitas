# CLAUDE.md — apps/api

API REST y worker de Canchitas. Fastify + TypeScript. Decisiones: ADR 0004 a 0009, 0014 y 0015.

## Estructura

```
src/
  main-api.ts            punto de entrada HTTP
  main-worker.ts         punto de entrada del worker (outbox + pg-boss)
  composition/           raíz de composición: acá se cablea todo, a mano
  shared/                piezas transversales sin dominio: Result, Clock, IdGenerator, errores HTTP, db, auth
  modules/
    <modulo>/
      domain/            entidades, value objects, reglas, eventos. TypeScript puro.
      application/       casos de uso (un archivo por comando), puertos, query services
      infrastructure/    repositorios Kysely, adaptadores externos
      http/              rutas Fastify + esquemas zod
      index.ts           API pública del módulo: lo único que otros módulos importan
```

Módulos: `cuentas`, `grupos`, `votaciones`, `partidos`, `estadisticas`, `pagos`, `canchas`, `moderacion`, `calificaciones`, `notificaciones`, `plataforma`.

## Reglas de capas

- `domain` no importa nada fuera de `domain` y `shared/result`. Ni Kysely, ni Fastify, ni zod, ni `Date.now()`: el tiempo entra por el puerto `Clock`.
- `application` define puertos (interfaces) y los usa. No conoce Kysely ni Fastify.
- `infrastructure` implementa los puertos. Es el único lugar con SQL.
- `http` traduce: valida con zod, llama al caso de uso y mapea el `Result` a respuesta o a `problem+json`.
- Un módulo nunca importa de `modules/<otro>/…` salvo `modules/<otro>/index.ts`. dependency-cruiser lo verifica.

## Casos de uso

- Uno por archivo, nombrado por el verbo del dominio: `confirmar-asistencia.ts` exporta `confirmarAsistencia`.
- Firma: recibe un comando tipado y el actor autenticado, y devuelve `Promise<Result<Salida, ErrorDeDominio>>`.
- Pasos:
  1. autorizar con el módulo de políticas;
  2. cargar el agregado;
  3. aplicar la regla del dominio;
  4. persistir;
  5. publicar eventos en el outbox;
  6. auditar si corresponde (TBD-08).

  Todo en la misma transacción (`UnitOfWork`).
- Las lecturas no pasan por el dominio: los query services leen las vistas `v_*` de la base.

## Errores

- Errores de dominio como uniones discriminadas con `neverthrow` (ADR 0008). No se lanzan excepciones por reglas de negocio.
- Los errores de Postgres (triggers, constraints) se traducen en el repositorio al error de dominio equivalente. Nunca llega un mensaje de Postgres al cliente.
- HTTP: `application/problem+json` con `type` estable por error.

## Endpoints

- Primero el esquema zod, después la ruta. El OpenAPI se regenera y se commitea en `contract/openapi.json`.
- Convenciones de rutas, idempotencia, ETag y paginación: ADR 0007.
- Cada endpoint declara qué requisito implementa en su `description` del OpenAPI.

## Tests

- `domain`: unitarios con Vitest; fast-check para reglas con números o secuencias.
- `application`: con puertos falsos en memoria.
- `infrastructure` y `http`: integración contra Postgres real con Testcontainers. No se mockea la base.
- Nombres con ID de requisito: `describe('RF-036 — lista de espera', …)`.

## Nunca

- `any`, `as` para esquivar el tipado, `!` de non-null.
- `console.log` (se usa el logger).
- Loguear mails, tokens, contraseñas o fechas de nacimiento.
- SQL fuera de `infrastructure`.
- Lógica de negocio en un handler HTTP.
