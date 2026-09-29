-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Votaciones de horario y de cancha (RF-020 a RF-025).
-- "Abierta" no se guarda: se calcula (cerrada_en y cierra_en contra now()).

CREATE TABLE votacion (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id            uuid NOT NULL REFERENCES grupo(id),
  tipo                tipo_votacion NOT NULL,
  creada_por          uuid REFERENCES usuario(id) ON DELETE SET NULL,
  cierra_en           timestamptz,              -- null = cierre manual (RF-020)
  cerrada_en          timestamptz,              -- cierre manual, o cierre anticipado por un admin
  opcion_ganadora_id  uuid,                     -- la más votada, o la que eligió un admin si hubo empate (RN-06)
  creado_en           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, tipo),
  CONSTRAINT cierre_futuro CHECK (cierra_en IS NULL OR cierra_en > creado_en)
);
CREATE INDEX votacion_grupo_idx ON votacion (grupo_id, creado_en DESC);
-- Para el worker: votaciones con cierre automático todavía sin resolver.
CREATE INDEX votacion_por_cerrar_idx ON votacion (cierra_en) WHERE opcion_ganadora_id IS NULL AND cierra_en IS NOT NULL;

CREATE TABLE opcion (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  votacion_id   uuid NOT NULL,
  tipo          tipo_votacion NOT NULL,
  inicio        timestamptz,                                  -- horario
  cancha_id     uuid REFERENCES cancha(id),                   -- cancha del directorio
  cancha_texto  text CHECK (length(btrim(cancha_texto)) BETWEEN 1 AND 120), -- "fuera del directorio" (RF-024)
  orden         smallint NOT NULL DEFAULT 0,
  FOREIGN KEY (votacion_id, tipo) REFERENCES votacion (id, tipo) ON DELETE CASCADE,
  UNIQUE (id, votacion_id),
  CONSTRAINT opcion_segun_tipo CHECK (
       (tipo = 'horario' AND inicio IS NOT NULL AND cancha_id IS NULL AND cancha_texto IS NULL)
    OR (tipo = 'cancha'  AND inicio IS NULL AND ((cancha_id IS NULL) <> (cancha_texto IS NULL)))
  )
);
CREATE INDEX opcion_votacion_idx ON opcion (votacion_id);

ALTER TABLE votacion ADD CONSTRAINT ganadora_de_esta_votacion
  FOREIGN KEY (opcion_ganadora_id, id) REFERENCES opcion (id, votacion_id)
  DEFERRABLE INITIALLY DEFERRED;

-- Varias opciones por persona (RF-021). Cambiar el voto = borrar e insertar mientras
-- la votación esté abierta (TBD-03).
CREATE TABLE voto (
  opcion_id   uuid NOT NULL REFERENCES opcion(id) ON DELETE CASCADE,
  jugador_id  uuid NOT NULL REFERENCES jugador(id),
  votado_en   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (opcion_id, jugador_id)
);
CREATE INDEX voto_jugador_idx ON voto (jugador_id);

CREATE FUNCTION votacion_abierta(v votacion) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT v.cerrada_en IS NULL AND v.opcion_ganadora_id IS NULL
     AND (v.cierra_en IS NULL OR now() < v.cierra_en)
$$;

-- Nadie vota (ni cambia el voto) con la votación cerrada, fuera del grupo,
-- ni como invitado sin mail verificado (TBD-13).
CREATE FUNCTION tg_voto_valido() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  r_opcion  opcion;
  v         votacion;
  j         jugador;
BEGIN
  SELECT * INTO r_opcion FROM opcion WHERE id = COALESCE(NEW.opcion_id, OLD.opcion_id);
  -- Borrado en cascada de la opción o la votación: la opción ya no existe, se deja pasar.
  IF r_opcion.id IS NULL THEN RETURN OLD; END IF;
  SELECT * INTO v FROM votacion WHERE id = r_opcion.votacion_id;
  IF NOT votacion_abierta(v) THEN
    RAISE EXCEPTION 'la votación está cerrada' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;

  SELECT * INTO j FROM jugador WHERE id = NEW.jugador_id;
  IF j.eliminado_en IS NOT NULL OR (j.usuario_id IS NULL AND j.email_verificado_en IS NULL) THEN
    RAISE EXCEPTION 'este jugador no puede votar' USING ERRCODE = 'check_violation';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM miembro m
    WHERE m.grupo_id = v.grupo_id AND m.jugador_id = NEW.jugador_id AND m.salida_en IS NULL
  ) THEN
    RAISE EXCEPTION 'solo votan los miembros del grupo' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER voto_valido BEFORE INSERT OR UPDATE OR DELETE ON voto
  FOR EACH ROW EXECUTE FUNCTION tg_voto_valido();

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP TABLE voto;
DROP FUNCTION tg_voto_valido();
DROP FUNCTION votacion_abierta(votacion);
ALTER TABLE votacion DROP CONSTRAINT ganadora_de_esta_votacion;
DROP TABLE opcion;
DROP TABLE votacion;
