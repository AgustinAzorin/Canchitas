-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Notificaciones, dispositivos, outbox de eventos, auditoría (TBD-08), métricas
-- y el borrado de cuenta (RN-21).

CREATE TABLE notificacion (                                  -- bandeja (RF-101)
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo        tipo_notificacion NOT NULL,
  grupo_id    uuid REFERENCES grupo(id),
  partido_id  uuid REFERENCES partido(id) ON DELETE CASCADE,
  datos       jsonb NOT NULL DEFAULT '{}',
  creada_en   timestamptz NOT NULL DEFAULT now(),
  leida_en    timestamptz
);
CREATE INDEX notificacion_usuario_idx   ON notificacion (usuario_id, creada_en DESC);
CREATE INDEX notificacion_no_leidas_idx ON notificacion (usuario_id) WHERE leida_en IS NULL;

CREATE TABLE notificacion_desactivada (                      -- RF-104
  usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  tipo        tipo_notificacion NOT NULL,
  PRIMARY KEY (usuario_id, tipo)
);

CREATE TABLE dispositivo (                                   -- tokens de FCM (RF-100); cerrar sesión borra la fila (RF-007)
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  plataforma     plataforma NOT NULL,
  push_token     text NOT NULL UNIQUE,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  ultimo_uso_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dispositivo_usuario_idx ON dispositivo (usuario_id);

-- Outbox: cada acción de dominio escribe su evento en la misma transacción.
-- El worker lo consume, arma notificaciones, manda push y agenda jobs diferidos.
CREATE TABLE outbox (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evento          text NOT NULL,             -- 'votacion.creada', 'participacion.baja', ...
  agregado_tipo   text NOT NULL,
  agregado_id     uuid NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  creado_en       timestamptz NOT NULL DEFAULT now(),
  procesado_en    timestamptz,
  intentos        smallint NOT NULL DEFAULT 0,
  ultimo_error    text
);
CREATE INDEX outbox_pendiente_idx ON outbox (id) WHERE procesado_en IS NULL;

-- Auditoría de acciones de admins de grupo y de moderación (TBD-08: sí; retención a definir).
-- Solo se agregan filas. La única modificación permitida es anonimizar al actor.
CREATE TABLE auditoria (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_usuario_id  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  accion            text NOT NULL,           -- 'partido.cancelar', 'miembro.expulsar', 'resultado.corregir', 'denuncia.resolver', ...
  entidad_tipo      text NOT NULL,
  entidad_id        uuid NOT NULL,
  grupo_id          uuid REFERENCES grupo(id),
  datos             jsonb NOT NULL DEFAULT '{}',   -- antes/después de lo que cambió
  creado_en         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auditoria_grupo_idx   ON auditoria (grupo_id, creado_en DESC);
CREATE INDEX auditoria_entidad_idx ON auditoria (entidad_tipo, entidad_id);

CREATE FUNCTION tg_auditoria_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.actor_usuario_id IS NULL
     AND (to_jsonb(NEW) - 'actor_usuario_id') = (to_jsonb(OLD) - 'actor_usuario_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'la auditoría no se modifica' USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER auditoria_inmutable BEFORE UPDATE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION tg_auditoria_inmutable();

-- RF-099: foto diaria de lo que no se puede reconstruir hacia atrás.
CREATE TABLE metrica_diaria (
  fecha  date   NOT NULL,
  clave  text   NOT NULL,    -- 'usuarios', 'grupos_activos', 'canchas_publicadas', ...
  valor  bigint NOT NULL,
  PRIMARY KEY (fecha, clave)
);

-- RN-21 / RF-008 / RNF-015. La API borra antes las filas de la librería de auth.
CREATE FUNCTION borrar_cuenta(p_usuario uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  j uuid;
  liberados uuid[];
BEGIN
  SELECT id INTO j FROM jugador WHERE usuario_id = p_usuario FOR UPDATE;

  -- Libera sus lugares en partidos futuros.
  WITH futuros AS (
    UPDATE participacion pa SET estado = 'baja', equipo_id = NULL
    FROM partido p
    WHERE p.id = pa.partido_id AND pa.jugador_id = j AND pa.estado <> 'baja'
      AND p.cancelado_en IS NULL AND p.resultado_cargado_en IS NULL AND p.inicio > now()
    RETURNING pa.partido_id
  )
  SELECT array_agg(partido_id) INTO liberados FROM futuros;

  UPDATE miembro SET rol = 'jugador' WHERE jugador_id = j AND rol = 'admin';
  UPDATE miembro SET salida_en = now(), motivo_salida = 'salio' WHERE jugador_id = j AND salida_en IS NULL;
  DELETE FROM voto WHERE jugador_id = j AND opcion_id IN (      -- solo votaciones abiertas
    SELECT o.id FROM opcion o JOIN votacion v ON v.id = o.votacion_id WHERE votacion_abierta(v)
  );

  -- Desde acá es "Jugador eliminado". Sus partidos pasados quedan; sus deudas no se muestran.
  UPDATE jugador SET usuario_id = NULL, eliminado_en = now() WHERE id = j;
  DELETE FROM usuario WHERE id = p_usuario;   -- notas, reseñas, calificaciones recibidas: cascada;
                                              -- calificaciones dadas: quedan anónimas (SET NULL)
  IF liberados IS NOT NULL THEN
    INSERT INTO outbox (evento, agregado_tipo, agregado_id, payload)
    SELECT 'participacion.baja', 'partido', unnest(liberados), jsonb_build_object('jugador_id', j, 'motivo', 'cuenta_borrada');
  END IF;
END $$;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP FUNCTION borrar_cuenta(uuid);
DROP TABLE metrica_diaria;
DROP TABLE auditoria;
DROP FUNCTION tg_auditoria_inmutable();
DROP TABLE outbox;
DROP TABLE dispositivo;
DROP TABLE notificacion_desactivada;
DROP TABLE notificacion;
