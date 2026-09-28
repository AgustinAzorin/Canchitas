-- migrate:up
-- Migración inicial sobre tablas vacías: no hace falta crear índices en forma concurrente
-- ni agregar FKs como NOT VALID. Las migraciones nuevas no llevan esta línea.
-- squawk-ignore-file require-concurrent-index-creation, adding-foreign-key-constraint, constraint-missing-not-valid, ban-drop-table, ban-drop-column
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
-- Todo lo derivado se calcula acá, no se guarda: estados de partido, estadísticas,
-- figura, avales, deuda, radar. Corregir un resultado recalcula todo solo (RF-049).
-- Con 600 partidos por mes (RD-007) no hace falta materializar nada.

-- Nombre visible de cualquier jugador.
CREATE VIEW v_jugador AS
SELECT j.id AS jugador_id,
       j.usuario_id,
       CASE WHEN j.eliminado_en IS NOT NULL THEN 'Jugador eliminado'
            WHEN j.usuario_id IS NOT NULL   THEN u.nombre_usuario::text
            ELSE j.nombre END                                   AS nombre_visible,
       (j.usuario_id IS NULL AND j.eliminado_en IS NULL)        AS es_invitado,
       (j.eliminado_en IS NOT NULL)                             AS eliminado,
       j.fusionado_a
FROM jugador j LEFT JOIN usuario u ON u.id = j.usuario_id;

-- Estado del partido derivado del tiempo y de los datos (diagrama de estados del SRS).
CREATE VIEW v_partido AS
SELECT p.*,
       cupo_de(p.modalidad) AS cupo,
       c.confirmados,
       c.en_espera,
       CASE
         WHEN p.cancelado_en IS NOT NULL          THEN 'cancelado'
         WHEN p.resultado_cargado_en IS NOT NULL  THEN 'jugado'
         WHEN now() < p.confirmacion_abre_en      THEN 'programado'
         WHEN c.confirmados >= cupo_de(p.modalidad) THEN 'completo'
         ELSE 'confirmacion_abierta'
       END AS estado
FROM partido p
CROSS JOIN LATERAL (
  SELECT count(*) FILTER (WHERE estado = 'confirmado') AS confirmados,
         count(*) FILTER (WHERE estado = 'en_espera')  AS en_espera
  FROM participacion WHERE partido_id = p.id
) c;

-- Lista de espera ordenada (RN-02).
CREATE VIEW v_lista_espera AS
SELECT pa.partido_id, pa.jugador_id, pa.confirmado_en, pa.oferta_vence_en, pa.oferta_respuesta,
       row_number() OVER (PARTITION BY pa.partido_id ORDER BY pa.confirmado_en, pa.id) AS posicion
FROM participacion pa
WHERE pa.estado = 'en_espera' AND pa.oferta_respuesta IS DISTINCT FROM 'vencida'
                              AND pa.oferta_respuesta IS DISTINCT FROM 'rechazada';

-- Bajas con su antelación (RF-039, RN-03). Solo la ven los admins: lo filtra la API.
CREATE VIEW v_baja AS
SELECT b.*, p.grupo_id, p.inicio, (p.inicio - b.baja_en) AS antelacion
FROM baja b JOIN partido p ON p.id = b.partido_id;

-- Cada fila es un jugador que jugó un partido con resultado, con el resultado desde su lado.
CREATE VIEW v_participante AS
SELECT pa.partido_id,
       pa.jugador_id,
       COALESCE(eq.grupo_id, p.grupo_id) AS grupo_id,        -- v2: el grupo de su lado
       p.inicio,
       p.cancha_id,
       pa.goles,
       pa.asistencias,
       eq.goles  AS goles_favor,
       rv.goles  AS goles_contra,
       CASE WHEN eq.goles > rv.goles THEN 'G' WHEN eq.goles = rv.goles THEN 'E' ELSE 'P' END AS resultado
FROM participacion pa
JOIN partido p         ON p.id = pa.partido_id
JOIN partido_equipo eq ON eq.id = pa.equipo_id
JOIN partido_equipo rv ON rv.partido_id = p.id AND rv.lado <> eq.lado
WHERE pa.estado = 'confirmado'
  AND p.resultado_cargado_en IS NOT NULL
  AND p.cancelado_en IS NULL;

-- Figura (RN-10): todos los empatados en el primer puesto. `cerrada` = pasaron las 48 h.
CREATE VIEW v_figura AS
WITH conteo AS (
  SELECT vf.partido_id, vf.votado_id AS jugador_id, count(*) AS votos
  FROM voto_figura vf GROUP BY 1, 2
), rankeado AS (
  SELECT c.*, rank() OVER (PARTITION BY partido_id ORDER BY votos DESC) AS puesto FROM conteo c
)
SELECT r.partido_id, r.jugador_id, r.votos,
       now() >= p.resultado_cargado_en + interval '48 hours' AS cerrada
FROM rankeado r JOIN partido p ON p.id = r.partido_id
WHERE r.puesto = 1;

CREATE VIEW v_estadisticas_grupo AS                                  -- RF-050, RF-052, RF-060
SELECT vp.grupo_id,
       vp.jugador_id,
       count(*)                                    AS pj,
       count(*) FILTER (WHERE vp.resultado = 'G')  AS pg,
       count(*) FILTER (WHERE vp.resultado = 'E')  AS pe,
       count(*) FILTER (WHERE vp.resultado = 'P')  AS pp,
       sum(vp.goles)::int                          AS goles,
       sum(vp.asistencias)::int                    AS asistencias,
       count(f.jugador_id) FILTER (WHERE f.cerrada) AS figuras
FROM v_participante vp
JOIN grupo g ON g.id = vp.grupo_id AND g.borrado_en IS NULL
LEFT JOIN v_figura f ON f.partido_id = vp.partido_id AND f.jugador_id = vp.jugador_id
GROUP BY vp.grupo_id, vp.jugador_id;

-- RF-051. Suma todos los grupos, incluidos los borrados (RN-23). Solo usuarios registrados.
CREATE VIEW v_estadisticas_global AS
SELECT j.usuario_id,
       count(*)                                    AS pj,
       count(*) FILTER (WHERE vp.resultado = 'G')  AS pg,
       count(*) FILTER (WHERE vp.resultado = 'E')  AS pe,
       count(*) FILTER (WHERE vp.resultado = 'P')  AS pp,
       sum(vp.goles)::int                          AS goles,
       sum(vp.asistencias)::int                    AS asistencias,
       count(f.jugador_id) FILTER (WHERE f.cerrada) AS figuras
FROM v_participante vp
JOIN jugador j ON j.id = vp.jugador_id AND j.usuario_id IS NOT NULL
LEFT JOIN v_figura f ON f.partido_id = vp.partido_id AND f.jugador_id = vp.jugador_id
GROUP BY j.usuario_id;

-- RF-056 / RN-11: solo cuentan los avales de la versión vigente del resultado.
CREATE VIEW v_avales AS
SELECT p.id AS partido_id,
       count(a.*) FILTER (WHERE a.correcto)     AS avales,
       count(a.*) FILTER (WHERE NOT a.correcto) AS rechazos
FROM partido p
LEFT JOIN aval a ON a.partido_id = p.id AND a.version = p.resultado_version
WHERE p.resultado_cargado_en IS NOT NULL
GROUP BY p.id;

-- RF-066 / RN-09. TBD-06 sigue abierto: por ahora se redondea hacia arriba al peso,
-- para que la suma nunca quede por debajo del costo de la cancha.
CREATE VIEW v_parte AS
SELECT vp.partido_id, vp.jugador_id, p.grupo_id,
       ceil(p.costo_total::numeric / count(*) OVER (PARTITION BY vp.partido_id))::int AS parte,
       pa.pagado_en
FROM v_participante vp
JOIN partido p        ON p.id = vp.partido_id
JOIN participacion pa ON pa.partido_id = vp.partido_id AND pa.jugador_id = vp.jugador_id
WHERE p.costo_total IS NOT NULL;

-- RF-068. Los jugadores eliminados no deben nada (RN-21).
CREATE VIEW v_deuda AS
SELECT pt.grupo_id, pt.jugador_id, sum(pt.parte)::int AS deuda
FROM v_parte pt
JOIN jugador j ON j.id = pt.jugador_id AND j.eliminado_en IS NULL
WHERE pt.pagado_en IS NULL
GROUP BY pt.grupo_id, pt.jugador_id;

-- RF-023 / RN-06: conteo por opción y si hay empate en el primer puesto.
CREATE VIEW v_votacion_resultado AS
WITH conteo AS (
  SELECT o.votacion_id, o.id AS opcion_id, count(vt.jugador_id) AS votos
  FROM opcion o LEFT JOIN voto vt ON vt.opcion_id = o.id
  GROUP BY o.votacion_id, o.id
)
SELECT c.votacion_id, c.opcion_id, c.votos,
       c.votos = max(c.votos) OVER w AND c.votos > 0                              AS primera,
       count(*) FILTER (WHERE c.votos = m.maximo AND m.maximo > 0) OVER w > 1     AS hay_empate,
       votacion_abierta(v)                                                         AS abierta
FROM conteo c
JOIN votacion v ON v.id = c.votacion_id
JOIN (SELECT votacion_id, max(votos) AS maximo FROM conteo GROUP BY 1) m ON m.votacion_id = c.votacion_id
WINDOW w AS (PARTITION BY c.votacion_id);

-- RN-16: promedio de lo recibido de otros (sin la autocalificación) y cantidad.
CREATE VIEW v_radar AS
SELECT c.calificado_usuario_id AS usuario_id,
       count(*)                          AS calificaciones,
       round(avg(c.velocidad), 1)        AS velocidad,
       round(avg(c.resistencia), 1)      AS resistencia,
       round(avg(c.fisico), 1)           AS fisico,
       round(avg(c.juego_aereo), 1)      AS juego_aereo,
       round(avg(c.control), 1)          AS control,
       round(avg(c.regate), 1)           AS regate,
       round(avg(c.tiro), 1)             AS tiro,
       round(avg(c.pase), 1)             AS pase
FROM calificacion c
WHERE c.calificador_usuario_id IS DISTINCT FROM c.calificado_usuario_id
GROUP BY c.calificado_usuario_id;

-- Directorio público (RF-070 a RF-079).
CREATE VIEW v_cancha_publica AS
SELECT c.id, c.nombre, c.direccion, c.zona, c.ubicacion, c.telefono, c.whatsapp,
       c.modalidades, c.superficies, c.techada,
       CASE WHEN cx.verificado_en IS NOT NULL THEN c.precio_hora END AS precio_hora,   -- RN-24
       (cx.verificado_en IS NOT NULL)                                AS complejo_registrado,
       r.puntaje, COALESCE(r.resenas, 0)                             AS resenas
FROM cancha c
LEFT JOIN complejo cx ON cx.id = c.complejo_id
LEFT JOIN LATERAL (
  SELECT round(avg(puntaje), 1) AS puntaje, count(*) AS resenas
  FROM resena WHERE cancha_id = c.id AND oculto_en IS NULL
) r ON true
WHERE c.estado = 'publicada' AND c.oculto_en IS NULL;

-- OBJ-01: grupo activo = 2 o más partidos jugados o por jugarse en los últimos 30 días.
CREATE VIEW v_grupo_activo AS
SELECT p.grupo_id, count(*) AS partidos_30d
FROM partido p JOIN grupo g ON g.id = p.grupo_id AND g.borrado_en IS NULL
WHERE p.cancelado_en IS NULL AND p.inicio >= now() - interval '30 days' AND p.inicio <= now()
GROUP BY p.grupo_id
HAVING count(*) >= 2;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
DROP VIEW v_grupo_activo;
DROP VIEW v_cancha_publica;
DROP VIEW v_radar;
DROP VIEW v_votacion_resultado;
DROP VIEW v_deuda;
DROP VIEW v_parte;
DROP VIEW v_avales;
DROP VIEW v_estadisticas_global;
DROP VIEW v_estadisticas_grupo;
DROP VIEW v_figura;
DROP VIEW v_participante;
DROP VIEW v_baja;
DROP VIEW v_lista_espera;
DROP VIEW v_partido;
DROP VIEW v_jugador;
