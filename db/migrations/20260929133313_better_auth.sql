-- migrate:up
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- Tablas propias de Better Auth (ADR 0009), generadas con su CLI y revisadas. Los nombres en
-- español salen del mapeo de apps/api/src/modules/cuentas/infrastructure/better-auth.ts.
-- Los ids los genera Better Auth como uuid.

-- Sesiones de la web (cookie) y de Android (bearer). 30 días desde el último uso (RNF-012).
CREATE TABLE sesion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  token           text NOT NULL UNIQUE,
  expira_en       timestamptz NOT NULL,
  ip              text,
  agente          text,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL
);
CREATE INDEX sesion_usuario_id_idx ON sesion (usuario_id);

-- Credenciales: solo 'credential' (mail y contraseña, RES-08). contrasena_hash es argon2id
-- (RNF-009). Las columnas de OAuth las exige el esquema de Better Auth y quedan vacías.
CREATE TABLE credencial (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id                uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  cuenta_id                 text NOT NULL,
  proveedor_id              text NOT NULL,
  contrasena_hash           text,
  token_acceso              text,
  token_refresco            text,
  token_id                  text,
  token_acceso_expira_en    timestamptz,
  token_refresco_expira_en  timestamptz,
  alcance                   text,
  creado_en                 timestamptz NOT NULL DEFAULT now(),
  actualizado_en            timestamptz NOT NULL
);
CREATE INDEX credencial_usuario_id_idx ON credencial (usuario_id);

-- Tokens de recuperación de contraseña: Better Auth borra la fila al usarla (RF-006, RNF-014).
-- La verificación de mail no pasa por acá: es un JWT firmado (ver RNF-014 en el módulo cuentas).
CREATE TABLE verificacion (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identificador   text NOT NULL,
  valor           text NOT NULL,
  expira_en       timestamptz NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verificacion_identificador_idx ON verificacion (identificador);

-- RF-007: cerrar sesión deja de mandar push a ese dispositivo. El dispositivo se registra con
-- su sesión (M2) y se borra con ella.
ALTER TABLE dispositivo ADD COLUMN sesion_id uuid;
ALTER TABLE dispositivo ADD CONSTRAINT dispositivo_sesion_id_fkey
  FOREIGN KEY (sesion_id) REFERENCES sesion(id) ON DELETE CASCADE NOT VALID;
-- Se valida en 20260929133317_validar_restricciones_better_auth.sql.
-- dispositivo está vacía hasta M2 (RF-100): el índice no bloquea a nadie.
-- squawk-ignore require-concurrent-index-creation
CREATE INDEX dispositivo_sesion_idx ON dispositivo (sesion_id);

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
-- squawk-ignore ban-drop-column
ALTER TABLE dispositivo DROP COLUMN sesion_id;
-- squawk-ignore ban-drop-table
DROP TABLE verificacion;
-- squawk-ignore ban-drop-table
DROP TABLE credencial;
-- squawk-ignore ban-drop-table
DROP TABLE sesion;
