-- db/tests/grupos_test.sql
-- Vista de grupos que leen los clientes (RF-010 a RF-012). Corre en una transacción que se deshace.
--   pg_prove -d canchitas_test db/tests/*.sql

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(5);

INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, estado, email_verificado_en, privacidad_aceptada_en)
SELECT n || '@mail.com', n, '2000-01-01', 'activa', now(), now()
FROM unnest(ARRAY['ana', 'beto', 'caro', 'dani']) n;
INSERT INTO jugador (usuario_id) SELECT id FROM usuario;
CREATE FUNCTION pg_temp.j(n text) RETURNS uuid LANGUAGE sql AS $$
  SELECT j.id FROM jugador j JOIN usuario u ON u.id = j.usuario_id WHERE u.nombre_usuario = $1
$$;

INSERT INTO grupo (nombre, creador_usuario_id, link_token)
SELECT 'Los del jueves', id, 'tok-jueves' FROM usuario WHERE nombre_usuario = 'ana';
CREATE TEMP TABLE g AS SELECT id FROM grupo WHERE link_token = 'tok-jueves';

SELECT results_eq(
  $$SELECT nombre, cantidad_miembros FROM v_grupo WHERE link_token = 'tok-jueves'$$,
  $$VALUES ('Los del jueves', 0)$$,
  'RF-010: un grupo sin miembros figura con 0'
);

INSERT INTO miembro (grupo_id, jugador_id, rol) SELECT id, pg_temp.j('ana'), 'admin' FROM g;
INSERT INTO miembro (grupo_id, jugador_id) SELECT id, pg_temp.j('beto') FROM g;
INSERT INTO miembro (grupo_id, jugador_id, salida_en, motivo_salida) SELECT id, pg_temp.j('caro'), now(), 'salio' FROM g;
INSERT INTO miembro (grupo_id, jugador_id, salida_en, motivo_salida) SELECT id, pg_temp.j('dani'), now(), 'expulsado' FROM g;

SELECT results_eq(
  $$SELECT cantidad_miembros FROM v_grupo WHERE link_token = 'tok-jueves'$$,
  $$VALUES (2)$$,
  'RN-27: la cantidad de miembros cuenta solo a los vigentes (RN-22: los que salieron siguen en miembro)'
);

UPDATE grupo SET link_token = 'tok-nuevo', link_regenerado_en = now() WHERE link_token = 'tok-jueves';
SELECT is_empty(
  $$SELECT 1 FROM v_grupo WHERE link_token = 'tok-jueves'$$,
  'RF-012: el link anterior ya no encuentra el grupo'
);

UPDATE grupo SET borrado_en = now() WHERE link_token = 'tok-nuevo';
SELECT is_empty(
  $$SELECT 1 FROM v_grupo WHERE link_token = 'tok-nuevo'$$,
  'RN-23: un grupo borrado no aparece'
);

SELECT table_privs_are('v_grupo', 'canchitas_api', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'ADR 0005: la API lee la vista');

SELECT * FROM finish();
ROLLBACK;
