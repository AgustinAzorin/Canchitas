-- db/tests/cuentas_test.sql
-- Tablas de Better Auth y su mapeo a `usuario` (ADR 0009). Corre en una transacción que se deshace.
--   pg_prove -d canchitas_test db/tests/*.sql

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(16);

-- Better Auth crea el usuario sin verificar y solo conoce email_verificado.
INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, privacidad_aceptada_en)
VALUES ('ana@mail.com', 'ana', '2000-01-01', now());
CREATE TEMP TABLE ana AS SELECT id FROM usuario WHERE nombre_usuario = 'ana';

SELECT results_eq(
  $$SELECT estado::text, email_verificado, email_verificado_en IS NULL FROM usuario WHERE nombre_usuario = 'ana'$$,
  $$VALUES ('sin_verificar', false, true)$$,
  'RF-001: la cuenta nueva queda sin verificar'
);

UPDATE usuario SET email_verificado = true WHERE nombre_usuario = 'ana';
SELECT results_eq(
  $$SELECT estado::text, email_verificado_en IS NOT NULL FROM usuario WHERE nombre_usuario = 'ana'$$,
  $$VALUES ('activa', true)$$,
  'RF-004: verificar el mail (email_verificado de Better Auth) activa la cuenta'
);

UPDATE usuario SET email_verificado = false WHERE nombre_usuario = 'ana';
SELECT results_eq(
  $$SELECT estado::text, email_verificado_en IS NULL FROM usuario WHERE nombre_usuario = 'ana'$$,
  $$VALUES ('sin_verificar', true)$$,
  'RF-004: desmarcar la verificación vuelve a "Sin verificar"'
);

INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, estado, email_verificado_en, privacidad_aceptada_en)
VALUES ('beto@mail.com', 'beto', '2000-01-01', 'activa', now(), now());
SELECT is(
  (SELECT email_verificado FROM usuario WHERE nombre_usuario = 'beto'), true,
  'RF-004: escribir estado activa marca email_verificado'
);

SELECT throws_like(
  $$UPDATE usuario SET estado = 'activa' WHERE nombre_usuario = 'ana'$$,
  '%verificacion_coherente%',
  'RF-004: no se activa una cuenta sin fecha de verificación'
);

SELECT throws_like(
  $$INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, privacidad_aceptada_en)
    VALUES ('ANA@mail.com', 'otra_ana', '2000-01-01', now())$$,
  '%duplicate key%',
  'RF-001: el mail es único sin importar mayúsculas'
);

SELECT throws_like(
  $$INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento) VALUES ('c@mail.com', 'carla', '2000-01-01')$$,
  '%privacidad_aceptada_en%',
  'RNF-018: no hay cuenta sin aceptación de la política de privacidad'
);

-- Sesiones y dispositivos.
INSERT INTO sesion (usuario_id, token, expira_en, actualizado_en)
SELECT id, 'tok-ana', now() + interval '30 days', now() FROM ana;
INSERT INTO dispositivo (usuario_id, plataforma, push_token, sesion_id)
SELECT a.id, 'android', 'fcm-ana', s.id FROM ana a JOIN sesion s ON s.usuario_id = a.id;

SELECT throws_like(
  $$INSERT INTO sesion (usuario_id, token, expira_en, actualizado_en)
    SELECT id, 'tok-ana', now(), now() FROM usuario WHERE nombre_usuario = 'beto'$$,
  '%duplicate key%',
  'RF-005: el token de sesión es único'
);

DELETE FROM sesion WHERE token = 'tok-ana';
SELECT is_empty(
  $$SELECT 1 FROM dispositivo WHERE push_token = 'fcm-ana'$$,
  'RF-007: cerrar la sesión borra el dispositivo registrado con ella (deja de recibir push)'
);

INSERT INTO sesion (usuario_id, token, expira_en, actualizado_en)
SELECT id, 'tok-ana-2', now() + interval '30 days', now() FROM ana;
INSERT INTO credencial (usuario_id, cuenta_id, proveedor_id, contrasena_hash, actualizado_en)
SELECT id, id::text, 'credential', 'hash-de-prueba', now() FROM ana;
DELETE FROM usuario WHERE nombre_usuario = 'ana';
SELECT is_empty($$SELECT 1 FROM sesion WHERE token = 'tok-ana-2'$$, 'las sesiones se van con el usuario');
SELECT is_empty($$SELECT 1 FROM credencial WHERE proveedor_id = 'credential'$$, 'la credencial se va con el usuario');

-- RNF-011: intentos de inicio, sin guardar el mail.
SELECT hasnt_column('intento_inicio', 'email', 'RNF-011: los intentos no guardan el mail');
SELECT lives_ok(
  $$INSERT INTO intento_inicio (email_hash, fallidos_consecutivos, bloqueado_hasta)
    VALUES (sha256('ana@mail.com'), 5, now() + interval '15 minutes')$$,
  'RNF-011: se guarda el bloqueo por hash del mail'
);
SELECT throws_like(
  $$INSERT INTO intento_inicio (email_hash, fallidos_consecutivos) VALUES ('\x00', 1)$$,
  '%email_hash_check%',
  'RNF-011: el hash es un SHA-256'
);

-- Permisos (ADR 0005): la API escribe las tablas de Better Auth.
SELECT table_privs_are('sesion', 'canchitas_api', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'ADR 0005: la API escribe sesiones');
SELECT table_privs_are('intento_inicio', 'canchitas_api', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'], 'ADR 0005: la API escribe intentos');

SELECT * FROM finish();
ROLLBACK;
