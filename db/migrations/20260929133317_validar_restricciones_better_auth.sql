-- migrate:up
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- Valida, en su propia transacción, las restricciones que agregaron como NOT VALID
-- 20260929133311_usuario_better_auth.sql y 20260929133313_better_auth.sql (db/CLAUDE.md).
ALTER TABLE usuario VALIDATE CONSTRAINT email_verificado_coherente;
ALTER TABLE dispositivo VALIDATE CONSTRAINT dispositivo_sesion_id_fkey;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- Una restricción validada no se puede volver a NOT VALID; las borra el down de las migraciones
-- que las crearon.
