# 0008 — Errores tipados en el dominio y problem+json en HTTP

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

Una regla de negocio que no se cumple ("cupo lleno", "la votación está cerrada") no es una excepción: es un resultado esperado que el cliente tiene que poder mostrar.

## Decisión

- El dominio y los casos de uso devuelven `Result<T, E>` (**neverthrow**) con errores de dominio como uniones discriminadas: `{ tipo: 'CupoLleno' } | { tipo: 'VotacionCerrada' } | …`.
- Las excepciones quedan para lo inesperado: fallas de infraestructura y bugs.
- En HTTP todo error sale como `application/problem+json` (RFC 9457), con `type` estable por error de dominio (por ejemplo `https://canchitas.app/errores/cupo-lleno`), `title` en español y el ID de requisito si aplica.
- Los errores que vienen de la base (triggers, constraints) se traducen al mismo error de dominio en el adaptador. El cliente nunca ve un mensaje de Postgres.

## Consecuencias

- Los clientes deciden qué mostrar según `type`, no según el texto.
- El catálogo de errores vive en el contrato OpenAPI.
