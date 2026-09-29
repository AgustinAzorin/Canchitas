-- migrate:up
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Roles con mínimo privilegio (ADR 0005).
--   canchitas_migrator  dueño del esquema: el único que hace DDL. Las migraciones siguientes
--                       empiezan con SET LOCAL ROLE canchitas_migrator (db/CLAUDE.md).
--   canchitas_api       lee y escribe datos; no puede crear, alterar ni borrar objetos.
--   canchitas_worker    igual que la API (outbox y trabajos diferidos, ADR 0006).
--   canchitas_readonly  solo lectura, para consultas manuales y métricas.
-- Los roles son de todo el cluster: si ya existen (otra base del mismo servidor) se reusan.
-- Se crean sin contraseña; la pone la infraestructura (SOPS en staging y prod, .env en dev).
-- Esta migración la corre un superusuario, porque crea roles y cambia dueños.

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['canchitas_migrator', 'canchitas_api', 'canchitas_worker', 'canchitas_readonly'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('CREATE ROLE %I LOGIN', r);
    END IF;
  END LOOP;
END
$$;

-- El migrador pasa a ser dueño de todo lo que crearon las migraciones anteriores, salvo lo que
-- pertenece a extensiones (postgis, citext), que sigue siendo del superusuario.
DO $$
DECLARE
  o record;
BEGIN
  -- Tablas, vistas y secuencias sueltas. Las secuencias de columnas identity cambian con su tabla.
  FOR o IN
    SELECT c.oid::regclass AS nombre, c.relkind
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
      AND NOT (c.relkind = 'S' AND EXISTS (
        SELECT FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i')))
  LOOP
    EXECUTE format('ALTER %s %s OWNER TO canchitas_migrator',
      CASE o.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'S' THEN 'SEQUENCE'
                     WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END,
      o.nombre);
  END LOOP;

  -- Funciones y procedimientos.
  FOR o IN
    SELECT p.oid::regprocedure AS nombre
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO canchitas_migrator', o.nombre);
  END LOOP;

  -- Enums, dominios y tipos compuestos sueltos (los de las tablas cambian con su tabla).
  FOR o IN
    SELECT t.oid::regtype AS nombre, t.typtype
    FROM pg_type t
    WHERE t.typnamespace = 'public'::regnamespace
      AND (t.typtype IN ('e', 'd')
           OR (t.typtype = 'c' AND (SELECT c.relkind FROM pg_class c WHERE c.oid = t.typrelid) = 'c'))
      AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER %s %s OWNER TO canchitas_migrator',
      CASE o.typtype WHEN 'd' THEN 'DOMAIN' ELSE 'TYPE' END, o.nombre);
  END LOOP;
END
$$;

GRANT USAGE, CREATE ON SCHEMA public TO canchitas_migrator;
GRANT USAGE ON SCHEMA public TO canchitas_api, canchitas_worker, canchitas_readonly;

-- Datos: la API y el worker leen y escriben; nadie más que el migrador toca schema_migrations.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO canchitas_api, canchitas_worker;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO canchitas_api, canchitas_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO canchitas_readonly;
REVOKE INSERT, UPDATE, DELETE ON schema_migrations FROM canchitas_api, canchitas_worker;

-- Lo que cree el migrador en adelante hereda los mismos permisos.
ALTER DEFAULT PRIVILEGES FOR ROLE canchitas_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO canchitas_api, canchitas_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE canchitas_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO canchitas_api, canchitas_worker;
ALTER DEFAULT PRIVILEGES FOR ROLE canchitas_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO canchitas_readonly;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- La corre un superusuario: devuelve los objetos a quien la ejecuta, quita permisos y
-- privilegios por defecto, y borra los roles que no se usan en otra base del cluster.
-- Los privilegios por defecto se revocan antes: REASSIGN OWNED seguido de DROP OWNED en la
-- misma transacción falla con "could not find tuple for default ACL".

ALTER DEFAULT PRIVILEGES FOR ROLE canchitas_migrator IN SCHEMA public
  REVOKE ALL ON TABLES FROM canchitas_api, canchitas_worker, canchitas_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE canchitas_migrator IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM canchitas_api, canchitas_worker;

REASSIGN OWNED BY canchitas_migrator TO CURRENT_USER;
DROP OWNED BY canchitas_migrator, canchitas_api, canchitas_worker, canchitas_readonly;

DO $$
DECLARE
  r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['canchitas_readonly', 'canchitas_worker', 'canchitas_api', 'canchitas_migrator'] LOOP
    IF NOT EXISTS (
      SELECT FROM pg_shdepend d
      WHERE d.refclassid = 'pg_authid'::regclass
        AND d.refobjid = (SELECT oid FROM pg_roles WHERE rolname = r)
        AND d.dbid <> (SELECT oid FROM pg_database WHERE datname = current_database())
    ) THEN
      EXECUTE format('DROP ROLE %I', r);
    END IF;
  END LOOP;
END
$$;
