-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Reseñas, calificaciones y notas, denuncias con ocultamiento automático,
-- y reclamo del historial de un invitado.

-- Jugaron juntos un partido con resultado (base de RN-14 y RN-15).
CREATE FUNCTION jugaron_juntos(u1 uuid, u2 uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM participacion a
    JOIN participacion b ON b.partido_id = a.partido_id
    JOIN partido p       ON p.id = a.partido_id
    JOIN jugador ja      ON ja.id = a.jugador_id
    JOIN jugador jb      ON jb.id = b.jugador_id
    WHERE ja.usuario_id = u1 AND jb.usuario_id = u2
      AND a.estado = 'confirmado' AND a.equipo_id IS NOT NULL
      AND b.estado = 'confirmado' AND b.equipo_id IS NOT NULL
      AND p.resultado_cargado_en IS NOT NULL
  )
$$;

CREATE FUNCTION comparten_grupo(u1 uuid, u2 uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM miembro m1 JOIN jugador j1 ON j1.id = m1.jugador_id
    JOIN miembro m2 ON m2.grupo_id = m1.grupo_id AND m2.salida_en IS NULL
    JOIN jugador j2 ON j2.id = m2.jugador_id
    JOIN grupo g    ON g.id = m1.grupo_id AND g.borrado_en IS NULL
    WHERE j1.usuario_id = u1 AND j2.usuario_id = u2 AND m1.salida_en IS NULL
  )
$$;

-- RN-15 + RF-124 + RF-125. También habilita dejar notas (RF-127).
CREATE FUNCTION puede_calificar(calificador uuid, calificado uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT u.recibe_calificaciones
     AND jugaron_juntos(calificador, calificado)
     AND (u.quien_califica = 'jugaron' OR comparten_grupo(calificador, calificado))
  FROM usuario u WHERE u.id = calificado
$$;

-- RF-085 / RN-14. Una reseña por usuario y cancha; reseñar de nuevo la reemplaza.
CREATE TABLE resena (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id         uuid NOT NULL REFERENCES cancha(id) ON DELETE CASCADE,
  autor_usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  puntaje           smallint NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
  texto             text CHECK (length(texto) <= 1000),
  creado_en         timestamptz NOT NULL DEFAULT now(),
  editado_en        timestamptz,
  oculto_en         timestamptz,                             -- RN-19
  UNIQUE (cancha_id, autor_usuario_id)
);

CREATE FUNCTION tg_resena_valida() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM participacion pa
    JOIN partido p ON p.id = pa.partido_id
    JOIN jugador j ON j.id = pa.jugador_id
    WHERE j.usuario_id = NEW.autor_usuario_id AND p.cancha_id = NEW.cancha_id
      AND pa.estado = 'confirmado' AND pa.equipo_id IS NOT NULL
      AND p.resultado_cargado_en IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'solo reseña quien jugó en esa cancha' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER resena_valida BEFORE INSERT ON resena
  FOR EACH ROW EXECUTE FUNCTION tg_resena_valida();

-- RF-120 a RF-123. La autocalificación es la fila con calificador = calificado.
-- Si el calificador borra su cuenta, la fila queda con calificador null y sigue sumando (RN-21).
-- El calificador nunca sale de la API (RNF-017).
CREATE TABLE calificacion (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calificador_usuario_id  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  calificado_usuario_id   uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  velocidad    smallint NOT NULL CHECK (velocidad   BETWEEN 1 AND 10),
  resistencia  smallint NOT NULL CHECK (resistencia BETWEEN 1 AND 10),
  fisico       smallint NOT NULL CHECK (fisico      BETWEEN 1 AND 10),
  juego_aereo  smallint NOT NULL CHECK (juego_aereo BETWEEN 1 AND 10),
  control      smallint NOT NULL CHECK (control     BETWEEN 1 AND 10),
  regate       smallint NOT NULL CHECK (regate      BETWEEN 1 AND 10),
  tiro         smallint NOT NULL CHECK (tiro        BETWEEN 1 AND 10),
  pase         smallint NOT NULL CHECK (pase        BETWEEN 1 AND 10),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (calificador_usuario_id, calificado_usuario_id)     -- RF-122: calificar de nuevo reemplaza (upsert)
);
CREATE INDEX calificacion_calificado_idx ON calificacion (calificado_usuario_id);

CREATE FUNCTION tg_calificacion_valida() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.calificador_usuario_id IS NULL                              -- calificador borrado (SET NULL)
     OR NEW.calificador_usuario_id = NEW.calificado_usuario_id THEN  -- autocalificación
    RETURN NEW;
  END IF;
  IF NOT puede_calificar(NEW.calificador_usuario_id, NEW.calificado_usuario_id) THEN
    RAISE EXCEPTION 'no está habilitado para calificar a este jugador' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER calificacion_valida BEFORE INSERT OR UPDATE ON calificacion
  FOR EACH ROW EXECUTE FUNCTION tg_calificacion_valida();

-- RF-127. Firmada; se borra si el autor borra su cuenta (RN-21).
CREATE TABLE nota (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autor_usuario_id         uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  destinatario_usuario_id  uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  texto                    text NOT NULL CHECK (length(btrim(texto)) BETWEEN 1 AND 500),
  creado_en                timestamptz NOT NULL DEFAULT now(),
  oculto_en                timestamptz,
  CONSTRAINT no_autonota CHECK (autor_usuario_id <> destinatario_usuario_id)
);
CREATE INDEX nota_destinatario_idx ON nota (destinatario_usuario_id, creado_en DESC);

CREATE FUNCTION tg_nota_valida() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT puede_calificar(NEW.autor_usuario_id, NEW.destinatario_usuario_id) THEN
    RAISE EXCEPTION 'no está habilitado para dejarle una nota' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER nota_valida BEFORE INSERT ON nota
  FOR EACH ROW EXECUTE FUNCTION tg_nota_valida();

-- RF-086 / RF-087 / RN-19. Referencia polimórfica: el trigger valida que el contenido exista.
CREATE TABLE denuncia (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                tipo_contenido NOT NULL,
  contenido_id        uuid NOT NULL,
  denunciante_id      uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  motivo              text CHECK (length(motivo) <= 500),
  creado_en           timestamptz NOT NULL DEFAULT now(),
  resuelta_en         timestamptz,
  resuelta_por        uuid REFERENCES usuario(id) ON DELETE SET NULL,
  resolucion          text CHECK (resolucion IN ('eliminado', 'restaurado')),
  UNIQUE (tipo, contenido_id, denunciante_id),
  CONSTRAINT resolucion_coherente CHECK ((resuelta_en IS NULL) = (resolucion IS NULL))
);
CREATE INDEX denuncia_pendiente_idx ON denuncia (tipo, contenido_id) WHERE resuelta_en IS NULL;

CREATE FUNCTION tg_denuncia_ocultar() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  existe     boolean;
  pendientes int;
BEGIN
  existe := CASE NEW.tipo
    WHEN 'resena' THEN EXISTS (SELECT 1 FROM resena WHERE id = NEW.contenido_id)
    WHEN 'nota'   THEN EXISTS (SELECT 1 FROM nota   WHERE id = NEW.contenido_id)
    WHEN 'cancha' THEN EXISTS (SELECT 1 FROM cancha WHERE id = NEW.contenido_id)
  END;
  IF NOT existe THEN
    RAISE EXCEPTION 'el contenido denunciado no existe' USING ERRCODE = 'foreign_key_violation';
  END IF;

  SELECT count(*) INTO pendientes FROM denuncia
   WHERE tipo = NEW.tipo AND contenido_id = NEW.contenido_id AND resuelta_en IS NULL;
  IF pendientes >= 3 THEN
    CASE NEW.tipo
      WHEN 'resena' THEN UPDATE resena SET oculto_en = now() WHERE id = NEW.contenido_id AND oculto_en IS NULL;
      WHEN 'nota'   THEN UPDATE nota   SET oculto_en = now() WHERE id = NEW.contenido_id AND oculto_en IS NULL;
      WHEN 'cancha' THEN UPDATE cancha SET oculto_en = now() WHERE id = NEW.contenido_id AND oculto_en IS NULL;
    END CASE;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER denuncia_ocultar AFTER INSERT ON denuncia
  FOR EACH ROW EXECUTE FUNCTION tg_denuncia_ocultar();

-- RF-112: un usuario pide quedarse con el historial de un invitado del grupo.
CREATE TABLE solicitud_historial (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitado_jugador_id  uuid NOT NULL REFERENCES jugador(id) ON DELETE CASCADE,
  usuario_id           uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  estado               estado_solicitud NOT NULL DEFAULT 'pendiente',
  creado_en            timestamptz NOT NULL DEFAULT now(),
  revisado_por         uuid REFERENCES usuario(id) ON DELETE SET NULL,
  revisado_en          timestamptz
);
CREATE UNIQUE INDEX solicitud_historial_pendiente_uq ON solicitud_historial (invitado_jugador_id) WHERE estado = 'pendiente';

-- Fusión aprobada: las participaciones (y con ellas bajas, avales y figura, por cascada) pasan
-- al jugador del usuario. El invitado queda marcado y sin membresía; sus votos de votaciones
-- viejas se quedan con él, porque no cuentan para ninguna estadística.
ALTER TABLE jugador ADD COLUMN fusionado_a uuid REFERENCES jugador(id);

CREATE FUNCTION fusionar_invitado(p_invitado uuid, p_usuario uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  inv      jugador;
  destino  uuid;
BEGIN
  SELECT * INTO inv FROM jugador WHERE id = p_invitado FOR UPDATE;
  IF inv.usuario_id IS NOT NULL OR inv.eliminado_en IS NOT NULL OR inv.fusionado_a IS NOT NULL THEN
    RAISE EXCEPTION 'no es un invitado activo';
  END IF;
  SELECT id INTO destino FROM jugador WHERE usuario_id = p_usuario;
  IF EXISTS (
    SELECT 1 FROM participacion a JOIN participacion b USING (partido_id)
    WHERE a.jugador_id = p_invitado AND b.jugador_id = destino
  ) THEN
    RAISE EXCEPTION 'el invitado y el usuario figuran en el mismo partido; hay que resolverlo a mano';
  END IF;

  UPDATE participacion SET jugador_id = destino WHERE jugador_id = p_invitado;

  INSERT INTO miembro (grupo_id, jugador_id)
  VALUES (inv.grupo_invitado_id, destino)
  ON CONFLICT (grupo_id, jugador_id) DO UPDATE SET salida_en = NULL, motivo_salida = NULL;
  DELETE FROM miembro WHERE jugador_id = p_invitado;
  DELETE FROM invitado_token WHERE jugador_id = p_invitado;

  UPDATE jugador SET fusionado_a = destino, email = NULL, email_verificado_en = NULL WHERE id = p_invitado;
END $$;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP FUNCTION fusionar_invitado(uuid, uuid);
ALTER TABLE jugador DROP COLUMN fusionado_a;
DROP TABLE solicitud_historial;
DROP TABLE denuncia;
DROP FUNCTION tg_denuncia_ocultar();
DROP TABLE nota;
DROP FUNCTION tg_nota_valida();
DROP TABLE calificacion;
DROP FUNCTION tg_calificacion_valida();
DROP TABLE resena;
DROP FUNCTION tg_resena_valida();
DROP FUNCTION puede_calificar(uuid, uuid);
DROP FUNCTION comparten_grupo(uuid, uuid);
DROP FUNCTION jugaron_juntos(uuid, uuid);
