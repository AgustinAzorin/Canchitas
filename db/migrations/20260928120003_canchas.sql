-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Directorio de canchas y complejos (RF-070 a RF-097).

CREATE TABLE complejo (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre                text NOT NULL,
  encargado_usuario_id  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  verificado_en         timestamptz,              -- "complejo registrado" = encargado + verificado
  creado_en             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verificado_con_encargado CHECK (verificado_en IS NULL OR encargado_usuario_id IS NOT NULL)
);

CREATE TABLE cancha (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complejo_id     uuid REFERENCES complejo(id) ON DELETE SET NULL,
  nombre          text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 80),
  direccion       text NOT NULL,
  zona            text,                                   -- barrio o localidad, para filtrar (RF-072)
  ubicacion       geography(Point, 4326),                 -- geocodificada con Nominatim (RI-006)
  telefono        text,
  whatsapp        text,                                   -- formato E.164 sin "+", listo para wa.me (RI-007)
  modalidades     modalidad[]  NOT NULL DEFAULT '{}',
  superficies     superficie[] NOT NULL DEFAULT '{}',
  techada         boolean NOT NULL DEFAULT false,
  precio_hora     integer CHECK (precio_hora > 0),        -- ARS; se muestra solo si el complejo está registrado (RN-24)
  estado          estado_cancha NOT NULL DEFAULT 'pendiente',
  propuesta_por   uuid REFERENCES usuario(id) ON DELETE SET NULL,  -- null = cargada por el admin de plataforma
  revisada_por    uuid REFERENCES usuario(id) ON DELETE SET NULL,
  revisada_en     timestamptz,
  oculto_en       timestamptz,                            -- 3 denuncias (RN-19)
  creado_en       timestamptz NOT NULL DEFAULT now(),
  actualizado_en  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT publicada_con_ubicacion CHECK (estado <> 'publicada' OR ubicacion IS NOT NULL),
  CONSTRAINT contacto_whatsapp CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]{10,15}$')
);
CREATE INDEX cancha_ubicacion_idx   ON cancha USING gist (ubicacion) WHERE estado = 'publicada';
CREATE INDEX cancha_modalidades_idx ON cancha USING gin (modalidades);
CREATE INDEX cancha_superficies_idx ON cancha USING gin (superficies);
CREATE INDEX cancha_pendientes_idx  ON cancha (creado_en) WHERE estado = 'pendiente';

-- TBD-04: quién sube fotos, formatos y tamaños. El archivo vive en R2; acá solo la clave.
CREATE TABLE cancha_foto (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id    uuid NOT NULL REFERENCES cancha(id) ON DELETE CASCADE,
  storage_key  text NOT NULL UNIQUE,
  orden        smallint NOT NULL DEFAULT 0,
  subida_por   uuid REFERENCES usuario(id) ON DELETE SET NULL,
  creado_en    timestamptz NOT NULL DEFAULT now()
);

-- RF-090/RF-091: reclamo de la ficha por el encargado de un complejo.
CREATE TABLE reclamo_complejo (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id     uuid NOT NULL REFERENCES cancha(id) ON DELETE CASCADE,
  usuario_id    uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  estado        estado_solicitud NOT NULL DEFAULT 'pendiente',
  evidencia     text,                                   -- lo que aporte para la verificación manual
  creado_en     timestamptz NOT NULL DEFAULT now(),
  revisado_por  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  revisado_en   timestamptz
);
CREATE UNIQUE INDEX reclamo_pendiente_uq ON reclamo_complejo (cancha_id, usuario_id) WHERE estado = 'pendiente';

-- RF-080: datos incorrectos en una ficha.
CREATE TABLE reporte_cancha (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cancha_id     uuid NOT NULL REFERENCES cancha(id) ON DELETE CASCADE,
  usuario_id    uuid REFERENCES usuario(id) ON DELETE SET NULL,
  motivo        text NOT NULL CHECK (length(btrim(motivo)) BETWEEN 1 AND 500),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  resuelto_por  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  resuelto_en   timestamptz
);
CREATE INDEX reporte_pendiente_idx ON reporte_cancha (creado_en) WHERE resuelto_en IS NULL;

-- RF-077 / RD-008: cada toque en "llamar" o "WhatsApp".
CREATE TABLE contacto_cancha (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cancha_id   uuid NOT NULL REFERENCES cancha(id) ON DELETE CASCADE,
  usuario_id  uuid REFERENCES usuario(id) ON DELETE SET NULL,
  tipo        tipo_contacto NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contacto_cancha_idx ON contacto_cancha (cancha_id, creado_en);

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP TABLE contacto_cancha;
DROP TABLE reporte_cancha;
DROP TABLE reclamo_complejo;
DROP TABLE cancha_foto;
DROP TABLE cancha;
DROP TABLE complejo;
