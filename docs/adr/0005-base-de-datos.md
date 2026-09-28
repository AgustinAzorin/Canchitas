# 0005 — Base de datos SQL-first

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

El modelo tiene reglas que conviene garantizar en la base (cupo con lock, votos solo en votaciones abiertas, avales versionados, ocultamiento por denuncias) y datos geográficos (RF-073). Ver `docs/modelo-datos/MODELO.md`.

## Decisión

- **PostgreSQL 16 con PostGIS y citext.**
- **El esquema se escribe en SQL**, no se genera desde un ORM. Migraciones con **dbmate**: archivos `db/migrations/<timestamp>_<nombre>.sql` con secciones `-- migrate:up` y `-- migrate:down`. Cada migración corre en una transacción y empieza con `SET LOCAL lock_timeout` y `SET LOCAL statement_timeout`.
- **Las migraciones aplicadas no se editan nunca.** Cualquier cambio es una migración nueva.
- **squawk** revisa en CI las migraciones nuevas (configuración en `.squawk.toml`).
- **pgTAP** para los tests de la base (`db/tests/`), corridos con `pg_prove`. Toda regla que viva en la base (trigger, constraint, vista con lógica) tiene su test.
- **Kysely** como query builder en la API, con tipos generados por `kysely-codegen` desde la base real, vistas incluidas. Sin ORM.
- `db/schema.sql` lo genera dbmate y se commitea: es la foto del esquema completo.
- **Roles con mínimo privilegio:** `canchitas_migrator` (DDL), `canchitas_api`, `canchitas_worker` y `canchitas_readonly`. La API y el worker no pueden alterar el esquema.

## Consecuencias

- Se descartan Prisma y Drizzle con migraciones propias: pelearían con triggers, vistas y PostGIS.
- Después de cada migración hay que regenerar `schema.sql` y los tipos de Kysely; CI falla si están desactualizados.
