-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Extensiones y tipos enumerados.
-- Convenciones:
--   * Todas las PK son uuid (gen_random_uuid). Si la API genera uuidv7, se pasa explícito.
--   * Todo instante es timestamptz. La UI muestra America/Argentina/Buenos_Aires (RNF-025).
--   * La plata son enteros en pesos (ARS), sin centavos (RNF-026, GUIDELINES).
--   * Los estados que dependen del tiempo NO se guardan: se calculan contra now() en las vistas.

CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE estado_cuenta      AS ENUM ('sin_verificar', 'activa');
CREATE TYPE rol_grupo          AS ENUM ('admin', 'jugador');
CREATE TYPE motivo_salida      AS ENUM ('salio', 'expulsado');
CREATE TYPE modalidad          AS ENUM ('f5', 'f7', 'f8', 'f11');
CREATE TYPE superficie         AS ENUM ('sintetico', 'natural', 'cemento');
CREATE TYPE tipo_votacion      AS ENUM ('horario', 'cancha');
CREATE TYPE estado_participacion AS ENUM ('confirmado', 'en_espera', 'baja');
CREATE TYPE respuesta_oferta   AS ENUM ('aceptada', 'rechazada', 'vencida');
CREATE TYPE lado_equipo        AS ENUM ('A', 'B');
CREATE TYPE estado_cancha      AS ENUM ('pendiente', 'publicada', 'rechazada', 'baja');
CREATE TYPE estado_solicitud   AS ENUM ('pendiente', 'aprobada', 'rechazada');
CREATE TYPE tipo_contacto      AS ENUM ('llamada', 'whatsapp');
CREATE TYPE tipo_contenido     AS ENUM ('resena', 'nota', 'cancha');
CREATE TYPE quien_califica     AS ENUM ('grupos', 'jugaron');           -- RF-125
CREATE TYPE visibilidad_perfil AS ENUM ('solo_yo', 'grupos', 'todos');  -- RF-126
CREATE TYPE plataforma         AS ENUM ('android', 'web');
CREATE TYPE tipo_notificacion  AS ENUM (                                -- RN-25
  'votacion_nueva', 'votacion_cerrada', 'partido_confirmado', 'confirmacion_abierta',
  'recordatorio_24h', 'recordatorio_2h', 'lugar_liberado', 'baja_jugador',
  'resultado_cargado', 'aval_rechazado', 'figura_abierta', 'figura_elegida',
  'deuda_pendiente', 'calificacion_recibida', 'nota_recibida',
  'cancha_aprobada', 'cancha_rechazada', 'reclamo_aprobado', 'reclamo_rechazado',
  'agregado_a_grupo'
);

-- Cupo por modalidad (RN-01): 2 × jugadores por equipo.
CREATE FUNCTION cupo_de(m modalidad) RETURNS int
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE m WHEN 'f5' THEN 10 WHEN 'f7' THEN 14 WHEN 'f8' THEN 16 WHEN 'f11' THEN 22 END
$$;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP FUNCTION cupo_de(modalidad);
DROP TYPE tipo_notificacion, plataforma, visibilidad_perfil, quien_califica, tipo_contenido,
  tipo_contacto, estado_solicitud, estado_cancha, lado_equipo, respuesta_oferta,
  estado_participacion, tipo_votacion, superficie, modalidad, motivo_salida, rol_grupo, estado_cuenta;
DROP EXTENSION postgis;
DROP EXTENSION citext;
