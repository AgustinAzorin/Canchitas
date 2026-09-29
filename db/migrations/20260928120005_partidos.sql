-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Series recurrentes, partidos, equipos, confirmaciones, lista de espera,
-- resultados, avales y figura (RF-030 a RF-060).

-- Una serie es una regla. Las instancias (partidos) las materializa el worker
-- unas semanas hacia adelante; la UNIQUE (serie_id, fecha_serie) evita duplicados.
-- "Esta y las siguientes" (RF-034) = cerrar la serie (hasta) y crear otra nueva.
CREATE TABLE serie (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id      uuid NOT NULL REFERENCES grupo(id),
  modalidad     modalidad NOT NULL,
  dia_semana    smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),  -- ISO: 1 = lunes
  hora          time NOT NULL,                                          -- hora local
  zona_horaria  text NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  cancha_id     uuid REFERENCES cancha(id),
  cancha_texto  text,
  desde         date NOT NULL,
  hasta         date,                                                   -- null = sin fin
  reemplaza_a   uuid REFERENCES serie(id),                              -- serie anterior, si nació de un corte
  creada_por    uuid REFERENCES usuario(id) ON DELETE SET NULL,
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT una_cancha CHECK (cancha_id IS NULL OR cancha_texto IS NULL),
  CONSTRAINT rango_valido CHECK (hasta IS NULL OR hasta >= desde)
);

CREATE TABLE partido (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id              uuid NOT NULL REFERENCES grupo(id),   -- grupo organizador
  serie_id              uuid REFERENCES serie(id),
  fecha_serie           date,                                 -- fecha original de la instancia
  inicio                timestamptz NOT NULL,
  modalidad             modalidad NOT NULL,
  cancha_id             uuid REFERENCES cancha(id),
  cancha_texto          text CHECK (length(btrim(cancha_texto)) BETWEEN 1 AND 120),
  confirmacion_abre_en  timestamptz NOT NULL,                 -- serie: inicio − 6 días (RN-05); directo: al crearlo
  votacion_horario_id   uuid REFERENCES votacion(id),
  votacion_cancha_id    uuid REFERENCES votacion(id),
  cancelado_en          timestamptz,
  cancelado_por         uuid REFERENCES usuario(id) ON DELETE SET NULL,
  motivo_cancelacion    text,
  resultado_cargado_en  timestamptz,                          -- primera carga; abre la votación de figura
  resultado_version     integer NOT NULL DEFAULT 0,           -- +1 en cada carga o corrección (RN-11)
  costo_total           integer CHECK (costo_total > 0),      -- ARS (RF-065)
  creado_por            uuid REFERENCES usuario(id) ON DELETE SET NULL,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (serie_id, fecha_serie),
  CONSTRAINT instancia_coherente CHECK ((serie_id IS NULL) = (fecha_serie IS NULL)),
  CONSTRAINT una_cancha CHECK (cancha_id IS NULL OR cancha_texto IS NULL),
  CONSTRAINT abre_antes_del_inicio CHECK (confirmacion_abre_en <= inicio),
  CONSTRAINT cancelado_con_motivo CHECK (cancelado_en IS NULL OR coalesce(length(btrim(motivo_cancelacion)), 0) > 0),
  CONSTRAINT resultado_despues_del_inicio CHECK (resultado_cargado_en IS NULL OR resultado_cargado_en >= inicio), -- RF-047
  CONSTRAINT cancelado_o_jugado CHECK (cancelado_en IS NULL OR resultado_cargado_en IS NULL),
  CONSTRAINT version_coherente CHECK ((resultado_version = 0) = (resultado_cargado_en IS NULL))
);
CREATE INDEX partido_grupo_inicio_idx ON partido (grupo_id, inicio DESC);
CREATE INDEX partido_cancha_idx       ON partido (cancha_id) WHERE cancha_id IS NOT NULL;
-- Para el worker: partidos futuros vivos (recordatorios, apertura de confirmación).
CREATE INDEX partido_proximos_idx     ON partido (inicio) WHERE cancelado_en IS NULL AND resultado_cargado_en IS NULL;

-- Los dos lados de un partido. En v1 los dos son del grupo organizador (grupo_id null).
-- En v2 (partidos contra otros equipos) cada lado representa a un grupo distinto.
CREATE TABLE partido_equipo (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id  uuid NOT NULL REFERENCES partido(id) ON DELETE CASCADE,
  lado        lado_equipo NOT NULL,
  nombre      text NOT NULL,                        -- "Claros" / "Oscuros" (GUIDELINES)
  grupo_id    uuid REFERENCES grupo(id),            -- v2; null = el grupo del partido
  goles       smallint CHECK (goles >= 0),
  UNIQUE (partido_id, lado),
  UNIQUE (id, partido_id)
);

-- Una fila por jugador y partido. No exige membresía: en v2 juegan personas de otros grupos
-- o que se sumaron por "falta jugador".
CREATE TABLE participacion (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id        uuid NOT NULL REFERENCES partido(id) ON DELETE CASCADE,
  jugador_id        uuid NOT NULL REFERENCES jugador(id),
  estado            estado_participacion NOT NULL,
  confirmado_en     timestamptz NOT NULL DEFAULT clock_timestamp(),  -- orden de la lista de espera (RN-02); no now(): es fijo por transacción
  equipo_id         uuid,
  goles             smallint NOT NULL DEFAULT 0 CHECK (goles >= 0),
  asistencias       smallint NOT NULL DEFAULT 0 CHECK (asistencias >= 0),
  -- Lista de espera (RN-04): oferta vigente al primero de la lista.
  oferta_enviada_en timestamptz,
  oferta_vence_en   timestamptz,
  oferta_respuesta  respuesta_oferta,
  -- Pago (RF-067). Solo lo marca un admin.
  pagado_en         timestamptz,
  pago_marcado_por  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  UNIQUE (partido_id, jugador_id),
  FOREIGN KEY (equipo_id, partido_id) REFERENCES partido_equipo (id, partido_id),
  CONSTRAINT equipo_solo_confirmados CHECK (equipo_id IS NULL OR estado = 'confirmado'),  -- RF-045
  CONSTRAINT oferta_coherente CHECK ((oferta_enviada_en IS NULL) = (oferta_vence_en IS NULL)),
  CONSTRAINT respuesta_con_oferta CHECK (oferta_respuesta IS NULL OR oferta_enviada_en IS NOT NULL),
  CONSTRAINT pago_coherente CHECK (pagado_en IS NULL OR estado = 'confirmado')
);
CREATE INDEX participacion_jugador_idx ON participacion (jugador_id);
CREATE INDEX participacion_espera_idx  ON participacion (partido_id, confirmado_en) WHERE estado = 'en_espera';
CREATE INDEX participacion_oferta_idx  ON participacion (oferta_vence_en) WHERE oferta_respuesta IS NULL AND oferta_vence_en IS NOT NULL;

-- Historial de bajas. La participación puede volver a "confirmado"; la baja queda (RF-039).
CREATE TABLE baja (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partido_id  uuid NOT NULL,
  jugador_id  uuid NOT NULL,
  baja_en     timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (partido_id, jugador_id) REFERENCES participacion (partido_id, jugador_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX baja_jugador_idx ON baja (jugador_id, baja_en DESC);

-- Cupo y ventana de confirmación. La API ya lo decide bajo lock; esto es la red de seguridad
-- contra dos confirmaciones simultáneas por el último lugar.
CREATE FUNCTION tg_participacion_cupo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  p          partido;
  ocupados   int;
BEGIN
  IF NEW.estado <> 'confirmado' OR (TG_OP = 'UPDATE' AND OLD.estado = 'confirmado') THEN
    RETURN NEW;
  END IF;
  SELECT * INTO p FROM partido WHERE id = NEW.partido_id FOR UPDATE;   -- serializa por partido
  IF p.cancelado_en IS NOT NULL OR p.resultado_cargado_en IS NOT NULL THEN
    RAISE EXCEPTION 'el partido ya no admite confirmaciones' USING ERRCODE = 'check_violation';
  END IF;
  IF now() < p.confirmacion_abre_en THEN
    RAISE EXCEPTION 'la confirmación todavía no abrió' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO ocupados FROM participacion
   WHERE partido_id = NEW.partido_id AND estado = 'confirmado' AND id <> NEW.id;
  IF ocupados >= cupo_de(p.modalidad) THEN
    RAISE EXCEPTION 'cupo lleno' USING ERRCODE = 'check_violation', HINT = 'anotar en_espera';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER participacion_cupo BEFORE INSERT OR UPDATE OF estado ON participacion
  FOR EACH ROW EXECUTE FUNCTION tg_participacion_cupo();

-- Avales (RF-055). Cuentan solo los de la versión vigente del resultado: corregir el resultado
-- sube resultado_version y los avales anteriores dejan de contar (RN-11) sin borrar historia.
CREATE TABLE aval (
  partido_id  uuid NOT NULL,
  jugador_id  uuid NOT NULL,
  version     integer NOT NULL,
  correcto    boolean NOT NULL,           -- false = rechazo
  avalado_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partido_id, jugador_id),
  FOREIGN KEY (partido_id, jugador_id) REFERENCES participacion (partido_id, jugador_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Figura (RF-058). Uno por votante; nadie se vota a sí mismo.
CREATE TABLE voto_figura (
  partido_id  uuid NOT NULL,
  votante_id  uuid NOT NULL,
  votado_id   uuid NOT NULL,
  votado_en   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partido_id, votante_id),
  FOREIGN KEY (partido_id, votante_id) REFERENCES participacion (partido_id, jugador_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (partido_id, votado_id)  REFERENCES participacion (partido_id, jugador_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT no_autovoto CHECK (votante_id <> votado_id)
);

-- "Participante" = confirmado y con equipo en un partido jugado.
CREATE FUNCTION es_participante(p_partido uuid, p_jugador uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM participacion pa JOIN partido p ON p.id = pa.partido_id
    WHERE pa.partido_id = p_partido AND pa.jugador_id = p_jugador
      AND pa.estado = 'confirmado' AND pa.equipo_id IS NOT NULL
      AND p.resultado_cargado_en IS NOT NULL
  )
$$;

CREATE FUNCTION tg_aval_valido() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Llamado desde un ON UPDATE CASCADE (fusión de un invitado, RF-112): no se revalida.
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NOT es_participante(NEW.partido_id, NEW.jugador_id) THEN
    RAISE EXCEPTION 'solo avalan los participantes de un partido jugado' USING ERRCODE = 'check_violation';
  END IF;
  -- La versión la fija la base, no el cliente.
  SELECT resultado_version INTO NEW.version FROM partido WHERE id = NEW.partido_id;
  NEW.avalado_en := now();
  RETURN NEW;
END $$;
CREATE TRIGGER aval_valido BEFORE INSERT OR UPDATE ON aval
  FOR EACH ROW EXECUTE FUNCTION tg_aval_valido();

CREATE FUNCTION tg_voto_figura_valido() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  abre timestamptz;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;   -- cascada de una fusión (RF-112)
  IF NOT es_participante(NEW.partido_id, NEW.votante_id) OR NOT es_participante(NEW.partido_id, NEW.votado_id) THEN
    RAISE EXCEPTION 'solo votan y son votados los participantes' USING ERRCODE = 'check_violation';
  END IF;
  SELECT resultado_cargado_en INTO abre FROM partido WHERE id = NEW.partido_id;
  IF now() >= abre + interval '48 hours' THEN                                   -- RN-10
    RAISE EXCEPTION 'la votación de figura está cerrada' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER voto_figura_valido BEFORE INSERT OR UPDATE ON voto_figura
  FOR EACH ROW EXECUTE FUNCTION tg_voto_figura_valido();

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP TABLE voto_figura;
DROP FUNCTION tg_voto_figura_valido();
DROP TABLE aval;
DROP FUNCTION tg_aval_valido();
DROP FUNCTION es_participante(uuid, uuid);
DROP TABLE baja;
DROP TABLE participacion;
DROP FUNCTION tg_participacion_cupo();
DROP TABLE partido_equipo;
DROP TABLE partido;
DROP TABLE serie;
