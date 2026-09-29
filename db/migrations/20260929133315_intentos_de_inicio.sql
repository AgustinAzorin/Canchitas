-- migrate:up
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- RNF-011: intentos fallidos de inicio de sesión por mail. Better Auth no bloquea cuentas, así
-- que lo hace la API (ADR 0009). Se cuenta aunque la cuenta no exista, para no revelar cuáles
-- existen, y por eso no se guarda el mail sino su SHA-256 (del mail en minúsculas).
-- Un inicio correcto borra la fila.
CREATE TABLE intento_inicio (
  email_hash             bytea PRIMARY KEY CHECK (length(email_hash) = 32),
  fallidos_consecutivos  integer NOT NULL CHECK (fallidos_consecutivos > 0),
  bloqueado_hasta        timestamptz,
  actualizado_en         timestamptz NOT NULL DEFAULT now()
);

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- squawk-ignore ban-drop-table
DROP TABLE intento_inicio;
