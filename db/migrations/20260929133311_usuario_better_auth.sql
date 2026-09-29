-- migrate:up
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- Better Auth usa `usuario` como su tabla de usuario (ADR 0009). Columnas que pide y `usuario`
-- no tenía, generadas con su CLI (`pnpm --filter @canchitas/api auth:sql`):
--   emailVerified -> email_verificado  (boolean; `usuario` lo expresaba con estado y email_verificado_en)
--   image         -> imagen            (no se usa: RES-08 deja afuera los proveedores con foto)
--   updatedAt     -> actualizado_en
-- name -> nombre_usuario, email -> email y createdAt -> creado_en ya existían.
--
-- Choque: Better Auth solo escribe email_verificado, pero `estado` (RF-004) y el CHECK
-- verificacion_coherente dependen de email_verificado_en. Un trigger mantiene las tres columnas
-- de acuerdo y un CHECK nuevo lo garantiza.

ALTER TABLE usuario ADD COLUMN email_verificado boolean NOT NULL DEFAULT false;
ALTER TABLE usuario ADD COLUMN imagen text;
ALTER TABLE usuario ADD COLUMN actualizado_en timestamptz NOT NULL DEFAULT now();

UPDATE usuario SET email_verificado = (estado = 'activa');

-- Quien cambia email_verificado (Better Auth) decide el estado; quien escribe estado (SQL propio,
-- tests) decide email_verificado.
CREATE FUNCTION tg_usuario_verificacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.email_verificado)
     OR (TG_OP = 'UPDATE' AND NEW.email_verificado IS DISTINCT FROM OLD.email_verificado) THEN
    IF NEW.email_verificado THEN
      NEW.estado := 'activa';
      NEW.email_verificado_en := coalesce(NEW.email_verificado_en, now());
    ELSE
      NEW.estado := 'sin_verificar';
      NEW.email_verificado_en := NULL;
    END IF;
  ELSE
    NEW.email_verificado := (NEW.estado = 'activa');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER usuario_verificacion BEFORE INSERT OR UPDATE ON usuario
  FOR EACH ROW EXECUTE FUNCTION tg_usuario_verificacion();

ALTER TABLE usuario ADD CONSTRAINT email_verificado_coherente
  CHECK (email_verificado = (estado = 'activa')) NOT VALID;
-- Se valida en 20260929133317_validar_restricciones_better_auth.sql.

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
ALTER TABLE usuario DROP CONSTRAINT email_verificado_coherente;
DROP TRIGGER usuario_verificacion ON usuario;
DROP FUNCTION tg_usuario_verificacion();
-- squawk-ignore ban-drop-column
ALTER TABLE usuario DROP COLUMN actualizado_en;
-- squawk-ignore ban-drop-column
ALTER TABLE usuario DROP COLUMN imagen;
-- squawk-ignore ban-drop-column
ALTER TABLE usuario DROP COLUMN email_verificado;
