-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Cuentas, jugadores (usuarios e invitados) y grupos.
--
-- Las tablas propias de autenticación (hash de contraseña, sesiones, tokens de
-- verificación y recuperación, intentos fallidos de RNF-011) las crea la librería
-- de auth. Su tabla de usuario se mapea a `usuario`, que tiene los campos de dominio.

CREATE TABLE usuario (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   citext NOT NULL UNIQUE,
  nombre_usuario          citext NOT NULL UNIQUE                           -- RF-003
                          CHECK (nombre_usuario ~ '^[a-z0-9_.]{3,20}$'),
  fecha_nacimiento        date NOT NULL,
  estado                  estado_cuenta NOT NULL DEFAULT 'sin_verificar',  -- RF-004
  email_verificado_en     timestamptz,
  privacidad_aceptada_en  timestamptz NOT NULL,                             -- RNF-018
  -- Privacidad del radar y las notas (RF-124 a RF-126)
  recibe_calificaciones   boolean NOT NULL DEFAULT true,
  quien_califica          quien_califica NOT NULL DEFAULT 'grupos',
  visibilidad_perfil      visibilidad_perfil NOT NULL DEFAULT 'grupos',
  creado_en               timestamptz NOT NULL DEFAULT now(),
  -- RN-20: 18 años o más al registrarse, en hora argentina.
  CONSTRAINT mayor_de_edad CHECK (
    fecha_nacimiento <= ((creado_en AT TIME ZONE 'America/Argentina/Buenos_Aires')::date - interval '18 years')
  ),
  CONSTRAINT verificacion_coherente CHECK ((estado = 'activa') = (email_verificado_en IS NOT NULL))
);

CREATE TABLE grupo (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre              text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 60),
  creador_usuario_id  uuid REFERENCES usuario(id) ON DELETE SET NULL,     -- RN-23: solo él borra
  link_token          text NOT NULL UNIQUE,                                -- RF-011/RF-012; regenerar = UPDATE
  link_regenerado_en  timestamptz,
  creado_en           timestamptz NOT NULL DEFAULT now(),
  borrado_en          timestamptz                                          -- borrado lógico (RN-23)
);

-- Identidad de juego. Todo lo que se juega (participaciones, votos, avales, figura)
-- apunta a un jugador, nunca a un usuario. Un jugador es exactamente una de tres cosas:
--   1. la identidad de un usuario registrado (1 a 1 con usuario);
--   2. un invitado sin cuenta, que pertenece a un grupo (SUP-08);
--   3. un usuario que borró su cuenta: "Jugador eliminado" (RN-21), sin datos personales.
CREATE TABLE jugador (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id           uuid UNIQUE REFERENCES usuario(id) ON DELETE RESTRICT, -- el borrado pasa por borrar_cuenta()
  grupo_invitado_id    uuid REFERENCES grupo(id),
  nombre               text CHECK (length(btrim(nombre)) BETWEEN 1 AND 40),   -- nombre visible del invitado
  -- TBD-13: el mail identifica al invitado que entra por link. No se muestra a nadie.
  -- Los invitados que agrega un admin por nombre (RF-111) no tienen mail ni pueden actuar solos.
  email                citext,
  email_verificado_en  timestamptz,
  eliminado_en         timestamptz,
  creado_en            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tipo_de_jugador CHECK (
       (usuario_id IS NOT NULL AND grupo_invitado_id IS NULL AND nombre IS NULL AND email IS NULL AND eliminado_en IS NULL)
    OR (usuario_id IS NULL AND eliminado_en IS NULL AND grupo_invitado_id IS NOT NULL AND nombre IS NOT NULL)
    OR (usuario_id IS NULL AND eliminado_en IS NOT NULL AND nombre IS NULL AND email IS NULL AND email_verificado_en IS NULL)
  ),
  CONSTRAINT verificado_requiere_email CHECK (email_verificado_en IS NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX jugador_invitado_email_uq  ON jugador (grupo_invitado_id, email)        WHERE email IS NOT NULL;
CREATE UNIQUE INDEX jugador_invitado_nombre_uq ON jugador (grupo_invitado_id, lower(nombre)) WHERE nombre IS NOT NULL;

-- Tokens del invitado: enlace mágico al mail (verificación) y sesión en la web.
-- Sin verificar el mail, nada impide escribir el mail de otro (TBD-13).
CREATE TABLE invitado_token (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jugador_id  uuid NOT NULL REFERENCES jugador(id) ON DELETE CASCADE,
  proposito   text NOT NULL CHECK (proposito IN ('verificacion', 'sesion')),
  token_hash  bytea NOT NULL UNIQUE,     -- se guarda el hash, nunca el token
  expira_en   timestamptz NOT NULL,
  usado_en    timestamptz,               -- verificación: un solo uso (RNF-014)
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Membresía. Salir o ser expulsado no borra la fila (RN-22): se marca la salida.
CREATE TABLE miembro (
  grupo_id       uuid NOT NULL REFERENCES grupo(id),
  jugador_id     uuid NOT NULL REFERENCES jugador(id),
  rol            rol_grupo NOT NULL DEFAULT 'jugador',
  unido_en       timestamptz NOT NULL DEFAULT now(),
  salida_en      timestamptz,
  motivo_salida  motivo_salida,
  silenciado     boolean NOT NULL DEFAULT false,         -- RF-103
  PRIMARY KEY (grupo_id, jugador_id),
  CONSTRAINT salida_coherente CHECK ((salida_en IS NULL) = (motivo_salida IS NULL))
);
CREATE INDEX miembro_jugador_idx ON miembro (jugador_id) WHERE salida_en IS NULL;

-- Solo un jugador con cuenta puede ser admin (los invitados y eliminados no).
CREATE FUNCTION tg_admin_requiere_cuenta() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rol = 'admin' AND NOT EXISTS (
    SELECT 1 FROM jugador WHERE id = NEW.jugador_id AND usuario_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'solo un usuario registrado puede ser admin' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER miembro_admin_requiere_cuenta BEFORE INSERT OR UPDATE OF rol ON miembro
  FOR EACH ROW EXECUTE FUNCTION tg_admin_requiere_cuenta();

-- Un invitado solo puede ser miembro de su propio grupo (RF-110).
CREATE FUNCTION tg_invitado_en_su_grupo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM jugador
    WHERE id = NEW.jugador_id AND usuario_id IS NULL AND eliminado_en IS NULL
      AND grupo_invitado_id <> NEW.grupo_id
  ) THEN
    RAISE EXCEPTION 'un invitado solo pertenece a su grupo' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER miembro_invitado_en_su_grupo BEFORE INSERT ON miembro
  FOR EACH ROW EXECUTE FUNCTION tg_invitado_en_su_grupo();

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP TABLE miembro;
DROP FUNCTION tg_invitado_en_su_grupo();
DROP FUNCTION tg_admin_requiere_cuenta();
DROP TABLE invitado_token;
DROP TABLE jugador;
DROP TABLE grupo;
DROP TABLE usuario;
