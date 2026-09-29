-- db/tests/roles_test.sql
-- Roles con mínimo privilegio (ADR 0005). Corre en una transacción que se deshace.
--   pg_prove -d canchitas_test db/tests/*.sql

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(16);

SELECT has_role('canchitas_migrator', 'ADR 0005: existe canchitas_migrator');
SELECT has_role('canchitas_api', 'ADR 0005: existe canchitas_api');
SELECT has_role('canchitas_worker', 'ADR 0005: existe canchitas_worker');
SELECT has_role('canchitas_readonly', 'ADR 0005: existe canchitas_readonly');

-- Objetos del esquema que no pertenecen a una extensión y no son del migrador.
CREATE TEMP VIEW ajenos AS
SELECT c.oid::regclass::text AS objeto
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  AND c.relowner <> (SELECT oid FROM pg_roles WHERE rolname = 'canchitas_migrator')
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
UNION ALL
SELECT p.oid::regprocedure::text
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proowner <> (SELECT oid FROM pg_roles WHERE rolname = 'canchitas_migrator')
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
UNION ALL
SELECT t.oid::regtype::text
FROM pg_type t
WHERE t.typnamespace = 'public'::regnamespace
  AND t.typtype IN ('e', 'd')
  AND t.typowner <> (SELECT oid FROM pg_roles WHERE rolname = 'canchitas_migrator')
  AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e');

SELECT is_empty('SELECT objeto FROM ajenos', 'ADR 0005: el migrador es dueño de tablas, vistas, funciones y tipos');

SELECT schema_privs_are('public', 'canchitas_api', ARRAY['USAGE'], 'ADR 0005: la API no puede crear objetos');
SELECT schema_privs_are('public', 'canchitas_worker', ARRAY['USAGE'], 'ADR 0005: el worker no puede crear objetos');
SELECT schema_privs_are('public', 'canchitas_readonly', ARRAY['USAGE'], 'ADR 0005: readonly no puede crear objetos');

SELECT table_privs_are('public', 'partido', 'canchitas_api', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'ADR 0005: la API lee y escribe datos');
SELECT table_privs_are('public', 'partido', 'canchitas_readonly', ARRAY['SELECT'],
  'ADR 0005: readonly solo lee');
SELECT table_privs_are('public', 'schema_migrations', 'canchitas_api', ARRAY['SELECT'],
  'ADR 0005: la API no toca schema_migrations');

SELECT throws_ok(
  $$SET LOCAL ROLE canchitas_api; ALTER TABLE partido ADD COLUMN intruso int$$,
  '42501', NULL, 'ADR 0005: la API no puede alterar una tabla');
SELECT throws_ok(
  $$SET LOCAL ROLE canchitas_worker; DROP VIEW v_partido$$,
  '42501', NULL, 'ADR 0005: el worker no puede borrar una vista');
SELECT throws_ok(
  $$SET LOCAL ROLE canchitas_api; CREATE TABLE intrusa (id int)$$,
  '42501', NULL, 'ADR 0005: la API no puede crear tablas');

-- Lo que crea el migrador hereda los permisos por defecto.
SELECT lives_ok(
  $$SET LOCAL ROLE canchitas_migrator; CREATE TABLE prueba_permisos (id int); RESET ROLE$$,
  'ADR 0005: el migrador puede crear tablas');
SELECT table_privs_are('public', 'prueba_permisos', 'canchitas_worker', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
  'ADR 0005: una tabla nueva del migrador queda disponible para el worker');

SELECT * FROM finish();
ROLLBACK;
