# CLAUDE.md — db

Esquema de Postgres 16 + PostGIS de Canchitas. SQL-first (ADR 0005). El porqué de cada tabla está en `docs/modelo-datos/MODELO.md`.

## Contenido

```
migrations/     migraciones de dbmate: <timestamp>_<nombre>.sql con -- migrate:up y -- migrate:down
tests/          tests pgTAP (*_test.sql), corren con pg_prove
schema.sql      foto del esquema generada por dbmate; se commitea, no se edita
```

## Reglas

- **Una migración aplicada no se edita nunca.** Todo cambio es una migración nueva: `pnpm db:new <nombre_en_snake_case>` (crea el archivo con el encabezado de abajo).
- **Toda migración tiene `down`** que deja la base exactamente como estaba.
- **Primeras líneas de cada sección:**
  ```sql
  SET LOCAL lock_timeout = '5s';
  SET LOCAL statement_timeout = '60s';
  SET LOCAL ROLE canchitas_migrator;
  ```
  El `SET LOCAL ROLE` es obligatorio desde la migración de roles (`20260928215000_roles.sql`): así todo objeto nuevo es de `canchitas_migrator` y hereda los permisos de la API, el worker y readonly, aunque dbmate se conecte como superusuario. `pnpm db:lint` lo verifica (ADR 0018).
- **Roles (ADR 0005):** `canchitas_migrator` es dueño del esquema y el único que hace DDL; `canchitas_api` y `canchitas_worker` leen y escriben datos; `canchitas_readonly` solo lee. La migración de roles y su `down` los corre un superusuario. En dev la contraseña de cada rol es su nombre.
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

dbmate, pg_dump y pg_prove corren dentro del contenedor de Postgres de `infra/compose`, para que `schema.sql` salga siempre igual.

1. `pnpm db:migrate`, `pnpm db:rollback` y `pnpm db:migrate`: tiene que ir y volver. Aplica en `canchitas` (y regenera `schema.sql`) y en `canchitas_test`.
2. Tests: `pnpm db:test`.
3. `pnpm db:lint` (squawk y la convención de rol).
4. Regenerar los tipos de Kysely (`pnpm --filter @canchitas/api db:types`) y commitear `db/schema.sql` actualizado.
