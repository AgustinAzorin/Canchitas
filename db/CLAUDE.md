# CLAUDE.md — db

Esquema de Postgres 16 + PostGIS de Canchitas. SQL-first (ADR 0005). El porqué de cada tabla está en `docs/modelo-datos/MODELO.md`.

## Contenido

```
migrations/     migraciones de dbmate: <timestamp>_<nombre>.sql con -- migrate:up y -- migrate:down
tests/          tests pgTAP (*_test.sql), corren con pg_prove
schema.sql      foto del esquema generada por dbmate; se commitea, no se edita
```

## Reglas

- **Una migración aplicada no se edita nunca.** Todo cambio es una migración nueva: `dbmate new <nombre_en_snake_case>`.
- **Toda migración tiene `down`** que deja la base exactamente como estaba.
- **Primeras líneas de cada sección:**
  ```sql
  SET LOCAL lock_timeout = '5s';
  SET LOCAL statement_timeout = '60s';
  ```
- **Migraciones seguras sobre tablas con datos:**
  - índices con `CREATE INDEX CONCURRENTLY`, en una migración aparte y con `-- migrate:up transaction:false`;
  - FKs y CHECKs nuevos como `NOT VALID` y después `VALIDATE CONSTRAINT`;
  - una columna `NOT NULL` nueva se agrega nullable, se completa y recién después se restringe.

  squawk lo revisa. Solo la migración inicial ignora esas reglas, porque corre sobre tablas vacías.
- **Una regla en la base tiene su test pgTAP** en `tests/`, con el ID del requisito en la descripción.
- **Lo derivado va en vistas `v_*`**, no en columnas que haya que mantener sincronizadas. El estado que depende del tiempo se calcula contra `now()`.
- **Plata** en `integer` (pesos). **Instantes** en `timestamptz`. **Textos case-insensitive** (mail, nombre de usuario) en `citext`.
- **Nombres** en español, en snake_case, sin tildes (ADR 0002).

## Después de cada migración

1. `dbmate up` y `dbmate rollback` y `dbmate up`: tiene que ir y volver.
2. Tests: `pg_prove -d <base_de_test> db/tests/*.sql`.
3. `squawk db/migrations/<nueva>.sql`.
4. Regenerar los tipos de Kysely de `apps/api` y commitear `db/schema.sql` actualizado.
