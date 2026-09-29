-- db/tests/reglas_test.sql
-- Reglas del SRS verificadas contra el esquema (pgTAP). Corre en una transacción
-- que se deshace: la base queda como estaba.
--   pg_prove -d canchitas_test db/tests/*.sql

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap;
SELECT plan(69);

-- ───────────── Cuentas ─────────────
-- 12 usuarios: agus (admin) y u01..u11.
INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, estado, email_verificado_en, privacidad_aceptada_en)
SELECT n || '@mail.com', n, '2000-01-01', 'activa', now(), now()
FROM (SELECT 'agus' AS n UNION ALL SELECT 'u' || lpad(i::text, 2, '0') FROM generate_series(1, 11) i) x;
INSERT INTO jugador (usuario_id) SELECT id FROM usuario;

CREATE TEMP TABLE id_de AS
SELECT u.nombre_usuario::text AS n, u.id AS uid, j.id AS jid FROM usuario u JOIN jugador j ON j.usuario_id = u.id;
CREATE FUNCTION pg_temp.j(n text) RETURNS uuid LANGUAGE sql AS $$ SELECT jid FROM id_de WHERE id_de.n = $1 $$;
CREATE FUNCTION pg_temp.u(n text) RETURNS uuid LANGUAGE sql AS $$ SELECT uid FROM id_de WHERE id_de.n = $1 $$;

SELECT throws_like($$INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, privacidad_aceptada_en)
  VALUES ('menor@mail.com', 'menor', (now() - interval '17 years')::date, now())$$, '%mayor_de_edad%', 'RN-20: 17 años no se registra');
SELECT throws_like($$INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, privacidad_aceptada_en)
  VALUES ('otro@mail.com', 'AGUS', '2000-01-01', now())$$, '%duplicate key%', 'RF-003: nombre de usuario único sin importar mayúsculas');
SELECT throws_like($$INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, privacidad_aceptada_en)
  VALUES ('x@mail.com', 'con espacio', '2000-01-01', now())$$, '%nombre_usuario_check%', 'formato de nombre de usuario');

-- ───────────── Grupo, invitados ─────────────
INSERT INTO grupo (nombre, creador_usuario_id, link_token) VALUES ('Los del sábado', pg_temp.u('agus'), 'tok-1'), ('Otro grupo', pg_temp.u('u11'), 'tok-2');
CREATE TEMP TABLE g AS SELECT (SELECT id FROM grupo WHERE link_token = 'tok-1') AS g1, (SELECT id FROM grupo WHERE link_token = 'tok-2') AS g2;

INSERT INTO miembro (grupo_id, jugador_id, rol) SELECT g1, pg_temp.j('agus'), 'admin' FROM g;
INSERT INTO miembro (grupo_id, jugador_id) SELECT g1, jid FROM g, id_de WHERE n BETWEEN 'u01' AND 'u10';
INSERT INTO miembro (grupo_id, jugador_id) SELECT g2, pg_temp.j('u11') FROM g;

INSERT INTO jugador (grupo_invitado_id, nombre, email, email_verificado_en) SELECT g1, 'Tomi', 'tomi@mail.com', now() FROM g;
INSERT INTO jugador (grupo_invitado_id, nombre) SELECT g1, 'Primo de Juan' FROM g;              -- RF-111, sin mail
CREATE TEMP TABLE inv AS SELECT (SELECT id FROM jugador WHERE nombre = 'Tomi') AS tomi, (SELECT id FROM jugador WHERE nombre = 'Primo de Juan') AS primo;
INSERT INTO miembro (grupo_id, jugador_id) SELECT g1, tomi FROM g, inv;
INSERT INTO miembro (grupo_id, jugador_id) SELECT g1, primo FROM g, inv;

SELECT throws_like(format($$INSERT INTO jugador (grupo_invitado_id, nombre, email) VALUES (%L, 'Tomás', 'TOMI@mail.com')$$, g1), '%duplicate key%', 'TBD-13: mail de invitado único por grupo') FROM g;
SELECT throws_like(format($$INSERT INTO miembro (grupo_id, jugador_id) VALUES (%L, %L)$$, g2, tomi), '%solo pertenece a su grupo%', 'RF-110: invitado fuera de su grupo') FROM g, inv;
SELECT throws_like(format($$UPDATE miembro SET rol = 'admin' WHERE jugador_id = %L$$, tomi), '%solo un usuario registrado%', 'un invitado no puede ser admin') FROM inv;

-- ───────────── Votaciones ─────────────
INSERT INTO votacion (grupo_id, tipo, creada_por, cierra_en) SELECT g1, 'horario', pg_temp.u('agus'), now() + interval '1 day' FROM g;
CREATE TEMP TABLE vt AS SELECT id AS v FROM votacion;
INSERT INTO opcion (votacion_id, tipo, inicio, orden) SELECT v, 'horario', now() + interval '3 days', 1 FROM vt;
INSERT INTO opcion (votacion_id, tipo, inicio, orden) SELECT v, 'horario', now() + interval '4 days', 2 FROM vt;
CREATE TEMP TABLE op AS SELECT (SELECT id FROM opcion WHERE orden = 1) AS sab, (SELECT id FROM opcion WHERE orden = 2) AS dom;

SELECT throws_like(format($$INSERT INTO opcion (votacion_id, tipo, cancha_texto) VALUES (%L, 'cancha', 'x')$$, v), '%foreign key%', 'opción de cancha en votación de horario') FROM vt;

INSERT INTO voto (opcion_id, jugador_id) SELECT sab, pg_temp.j('u01') FROM op;
INSERT INTO voto (opcion_id, jugador_id) SELECT dom, pg_temp.j('u01') FROM op;                -- RF-021: varias opciones
INSERT INTO voto (opcion_id, jugador_id) SELECT sab, pg_temp.j('u02') FROM op;
INSERT INTO voto (opcion_id, jugador_id) SELECT dom, tomi FROM op, inv;                        -- invitado verificado
DELETE FROM voto WHERE jugador_id = pg_temp.j('u02');                                          -- TBD-03: cambia el voto
INSERT INTO voto (opcion_id, jugador_id) SELECT dom, pg_temp.j('u02') FROM op;

SELECT throws_like(format($$INSERT INTO voto (opcion_id, jugador_id) VALUES (%L, %L)$$, sab, primo), '%no puede votar%', 'TBD-13: invitado sin mail verificado no vota') FROM op, inv;
SELECT throws_like(format($$INSERT INTO voto (opcion_id, jugador_id) VALUES (%L, %L)$$, sab, pg_temp.j('u11')), '%solo votan los miembros%', 'no miembro no vota') FROM op;

SELECT ok((SELECT bool_and(NOT hay_empate) AND bool_or(primera AND opcion_id = (SELECT dom FROM op)) FROM v_votacion_resultado), 'RF-023: gana domingo (3 a 1)');
INSERT INTO voto (opcion_id, jugador_id) SELECT sab, pg_temp.j('u03') FROM op;
INSERT INTO voto (opcion_id, jugador_id) SELECT sab, pg_temp.j('u04') FROM op;
SELECT ok((SELECT bool_and(hay_empate) FROM v_votacion_resultado), 'RN-06: empate 3 a 3 detectado');

UPDATE votacion SET cerrada_en = now();
SELECT throws_like(format($$INSERT INTO voto (opcion_id, jugador_id) VALUES (%L, %L)$$, sab, pg_temp.j('u05')), '%está cerrada%', 'votación cerrada no acepta votos') FROM op;
SELECT throws_like(format($$DELETE FROM voto WHERE jugador_id = %L$$, pg_temp.j('u01')), '%está cerrada%', 'votación cerrada no permite cambiar el voto');
UPDATE votacion SET opcion_ganadora_id = (SELECT dom FROM op);                                  -- el admin desempata

-- ───────────── Directorio ─────────────
INSERT INTO cancha (nombre, direccion, zona, ubicacion, whatsapp, modalidades, superficies, estado, precio_hora)
VALUES ('Cancha X', 'Av. Siempreviva 742', 'Monserrat', 'SRID=4326;POINT(-58.38 -34.61)', '5491122334455', '{f5,f7}', '{sintetico}', 'publicada', 50000);
CREATE TEMP TABLE cx AS SELECT id AS c FROM cancha;
SELECT throws_like($$INSERT INTO cancha (nombre, direccion, estado) VALUES ('Sin coords', 'x', 'publicada')$$, '%publicada_con_ubicacion%', 'no se publica sin ubicación');
SELECT ok((SELECT precio_hora IS NULL FROM v_cancha_publica), 'RN-24: sin complejo registrado no se muestra precio');
SELECT ok((SELECT count(*) = 1 FROM cancha WHERE ST_DWithin(ubicacion, 'SRID=4326;POINT(-58.40 -34.61)'::geography, 5000)), 'RF-073: filtro por distancia con PostGIS');

-- ───────────── Partido futuro: cupo y lista de espera ─────────────
INSERT INTO partido (grupo_id, inicio, modalidad, cancha_id, confirmacion_abre_en)
SELECT g1, now() + interval '1 day', 'f5', c, now() - interval '1 hour' FROM g, cx;
CREATE TEMP TABLE pf AS SELECT id AS p FROM partido;
INSERT INTO participacion (partido_id, jugador_id, estado) SELECT p, jid, 'confirmado' FROM pf, id_de WHERE n <= 'u09';                  -- agus + u01..u09 = 10
SELECT ok((SELECT confirmados = 10 FROM pf JOIN v_partido vp ON vp.id = p) AND (SELECT estado = 'completo' FROM pf JOIN v_partido vp ON vp.id = p), 'RN-01: f5 completa con 10');
SELECT throws_like(format($$INSERT INTO participacion (partido_id, jugador_id, estado) VALUES (%L, %L, 'confirmado')$$, p, pg_temp.j('u10')), '%cupo lleno%', 'el 11° no entra como confirmado') FROM pf;
INSERT INTO participacion (partido_id, jugador_id, estado) SELECT p, pg_temp.j('u10'), 'en_espera' FROM pf;
INSERT INTO participacion (partido_id, jugador_id, estado) SELECT p, tomi, 'en_espera' FROM pf, inv;
SELECT ok((SELECT jugador_id = pg_temp.j('u10') FROM v_lista_espera WHERE posicion = 1), 'RN-02: primero en la espera el que confirmó antes');

UPDATE participacion SET estado = 'baja' WHERE jugador_id = pg_temp.j('u01') AND partido_id = (SELECT p FROM pf);
INSERT INTO baja (partido_id, jugador_id) SELECT p, pg_temp.j('u01') FROM pf;
SELECT ok((SELECT estado = 'confirmacion_abierta' FROM pf JOIN v_partido vp ON vp.id = p), 'baja libera el cupo');
SELECT ok((SELECT antelacion BETWEEN interval '23 hours' AND interval '24 hours' FROM v_baja), 'RN-03: antelación de la baja');
UPDATE participacion SET oferta_enviada_en = now(), oferta_vence_en = now() + interval '2 hours' WHERE jugador_id = pg_temp.j('u10');
UPDATE participacion SET estado = 'confirmado', oferta_respuesta = 'aceptada' WHERE jugador_id = pg_temp.j('u10');
SELECT ok((SELECT estado = 'completo' FROM pf JOIN v_partido vp ON vp.id = p), 'RF-038: el de la espera toma el lugar');
SELECT throws_like(format($$UPDATE partido SET resultado_cargado_en = now(), resultado_version = 1 WHERE id = %L$$, p), '%resultado_despues_del_inicio%', 'RF-047: no se carga resultado antes del inicio') FROM pf;

INSERT INTO partido (grupo_id, inicio, modalidad, confirmacion_abre_en) SELECT g1, now() + interval '8 days', 'f5', now() + interval '2 days' FROM g;
SELECT throws_like(format($$INSERT INTO participacion (partido_id, jugador_id, estado) SELECT id, %L, 'confirmado' FROM partido WHERE confirmacion_abre_en > now()$$, pg_temp.j('agus')), '%todavía no abrió%', 'RN-05: confirmación antes de que abra');
SELECT ok((SELECT estado = 'programado' FROM v_partido WHERE confirmacion_abre_en > now()), 'estado programado');

-- ───────────── Partido jugado: resultado, stats, avales, figura, costos ─────────────
INSERT INTO partido (grupo_id, inicio, modalidad, cancha_id, confirmacion_abre_en, costo_total)
SELECT g1, now() - interval '3 hours', 'f5', c, now() - interval '5 days', 60000 FROM g, cx;
CREATE TEMP TABLE pj AS SELECT id AS p FROM partido WHERE inicio < now();
INSERT INTO partido_equipo (partido_id, lado, nombre) SELECT p, 'A'::lado_equipo, 'Claros' FROM pj UNION ALL SELECT p, 'B'::lado_equipo, 'Oscuros' FROM pj;
-- Claros: agus, u01..u04. Oscuros: u05..u08, Tomi.
INSERT INTO participacion (partido_id, jugador_id, estado, equipo_id, goles)
SELECT pj.p, x.jid, 'confirmado', e.id, x.goles
FROM pj,
     (SELECT jid, n, CASE n WHEN 'agus' THEN 3 WHEN 'u01' THEN 2 WHEN 'u05' THEN 3 ELSE 0 END AS goles FROM id_de WHERE n <= 'u08'
      UNION ALL SELECT tomi, 'tomi', 0 FROM inv) x
JOIN partido_equipo e ON e.partido_id = (SELECT p FROM pj) AND e.lado = CASE WHEN x.n IN ('agus','u01','u02','u03','u04') THEN 'A'::lado_equipo ELSE 'B' END;
INSERT INTO participacion (partido_id, jugador_id, estado) SELECT p, pg_temp.j('u09'), 'en_espera' FROM pj;   -- no jugó

UPDATE partido_equipo SET goles = CASE lado WHEN 'A' THEN 5 ELSE 3 END WHERE partido_id = (SELECT p FROM pj);
UPDATE partido SET resultado_cargado_en = now(), resultado_version = 1 WHERE id = (SELECT p FROM pj);

SELECT ok((SELECT pj = 1 AND pg = 1 AND goles = 3 FROM v_estadisticas_grupo WHERE jugador_id = pg_temp.j('agus')), 'RF-050: stats del ganador');
SELECT ok((SELECT pp = 1 FROM v_estadisticas_grupo WHERE jugador_id = pg_temp.j('u05')), 'RF-050: stats del perdedor');
SELECT ok((SELECT count(*) = 10 FROM v_participante), 'solo cuentan los 10 que jugaron');
SELECT throws_like(format($$INSERT INTO participacion (partido_id, jugador_id, estado) VALUES (%L, %L, 'confirmado')$$, p, pg_temp.j('u10')), '%ya no admite%', 'no se confirma a un partido jugado') FROM pj;

-- Avales
INSERT INTO aval (partido_id, jugador_id, version, correcto) SELECT p, pg_temp.j('u01'), 0, true FROM pj;
INSERT INTO aval (partido_id, jugador_id, version, correcto) SELECT p, pg_temp.j('u05'), 0, false FROM pj;
SELECT ok((SELECT avales = 1 AND rechazos = 1 FROM v_avales), 'RF-056: 1 aval, 1 rechazo (la versión la fija la base)');
SELECT throws_like(format($$INSERT INTO aval (partido_id, jugador_id, version, correcto) VALUES (%L, %L, 1, true)$$, p, pg_temp.j('u09')), '%solo avalan%', 'RN-11: el que no jugó no avala') FROM pj;
UPDATE partido_equipo SET goles = 4 WHERE partido_id = (SELECT p FROM pj) AND lado = 'A';     -- corrección
UPDATE partido SET resultado_version = resultado_version + 1 WHERE id = (SELECT p FROM pj);
SELECT ok((SELECT avales = 0 AND rechazos = 0 FROM v_avales), 'RN-11: la corrección reinicia los avales');

-- Figura: empate entre agus y u05
INSERT INTO voto_figura (partido_id, votante_id, votado_id) SELECT p, pg_temp.j(v), pg_temp.j(w) FROM pj,
  (VALUES ('u01','agus'), ('u02','agus'), ('u06','u05'), ('u07','u05'), ('u03','u01')) t(v, w);
SELECT throws_like(format($$INSERT INTO voto_figura VALUES (%L, %L, %L)$$, p, pg_temp.j('u04'), pg_temp.j('u04')), '%no_autovoto%', 'RN-10: no se vota a sí mismo') FROM pj;
SELECT throws_like(format($$INSERT INTO voto_figura VALUES (%L, %L, %L)$$, p, pg_temp.j('u09'), pg_temp.j('agus')), '%solo votan%', 'RN-10: vota solo quien jugó') FROM pj;
SELECT ok((SELECT count(*) = 2 AND bool_and(NOT cerrada) FROM v_figura), 'RF-059: figura compartida, votación todavía abierta');
SELECT ok((SELECT figuras = 0 FROM v_estadisticas_grupo WHERE jugador_id = pg_temp.j('agus')), 'la figura no suma hasta que cierra');
-- Viaje en el tiempo: el partido fue hace 4 días.
UPDATE partido SET inicio = now() - interval '4 days', confirmacion_abre_en = now() - interval '9 days', resultado_cargado_en = now() - interval '3 days' WHERE id = (SELECT p FROM pj);
SELECT ok((SELECT figuras = 1 FROM v_estadisticas_grupo WHERE jugador_id = pg_temp.j('agus')), 'RF-060: figura contada al cerrar las 48 h');
SELECT throws_like(format($$INSERT INTO voto_figura VALUES (%L, %L, %L)$$, p, pg_temp.j('u08'), pg_temp.j('u05')), '%está cerrada%', 'RN-10: no se vota después de 48 h') FROM pj;

-- Costos
SELECT ok((SELECT bool_and(parte = 6000) FROM v_parte), 'RN-09: $60.000 / 10 = $6.000');
UPDATE participacion SET pagado_en = now(), pago_marcado_por = pg_temp.u('agus') WHERE partido_id = (SELECT p FROM pj) AND jugador_id = pg_temp.j('u01');
SELECT ok((SELECT count(*) = 9 AND bool_and(deuda = 6000) FROM v_deuda), 'RF-068: deuda de los 9 que no pagaron');
UPDATE partido SET costo_total = 60001 WHERE id = (SELECT p FROM pj);
SELECT ok((SELECT bool_and(parte = 6001) FROM v_parte), 'TBD-06: redondeo hacia arriba');
UPDATE partido SET costo_total = 60000 WHERE id = (SELECT p FROM pj);

-- ───────────── Reseñas, calificaciones, notas, denuncias ─────────────
INSERT INTO resena (cancha_id, autor_usuario_id, puntaje) SELECT c, pg_temp.u('u02'), 4 FROM cx;
SELECT throws_like(format($$INSERT INTO resena (cancha_id, autor_usuario_id, puntaje) VALUES (%L, %L, 5)$$, c, pg_temp.u('u11')), '%solo reseña%', 'RN-14: no reseña quien no jugó ahí') FROM cx;
SELECT ok((SELECT puntaje = 4 AND resenas = 1 FROM v_cancha_publica), 'puntaje en el directorio');

INSERT INTO denuncia (tipo, contenido_id, denunciante_id) SELECT 'resena', r.id, pg_temp.u(n) FROM resena r, (VALUES ('u03'), ('u04')) t(n);
SELECT ok((SELECT oculto_en IS NULL FROM resena), '2 denuncias: sigue visible');
SELECT throws_like(format($$INSERT INTO denuncia (tipo, contenido_id, denunciante_id) VALUES ('resena', %L, %L)$$, (SELECT id FROM resena), pg_temp.u('u03')), '%duplicate key%', 'RF-086: no se denuncia dos veces');
INSERT INTO denuncia (tipo, contenido_id, denunciante_id) SELECT 'resena', r.id, pg_temp.u('u05') FROM resena r;
SELECT ok((SELECT oculto_en IS NOT NULL FROM resena) AND (SELECT resenas = 0 FROM v_cancha_publica), 'RN-19: 3 denuncias ocultan la reseña');
SELECT throws_like(format($$INSERT INTO denuncia (tipo, contenido_id, denunciante_id) VALUES ('nota', gen_random_uuid(), %L)$$, pg_temp.u('u03')), '%no existe%', 'denuncia a contenido inexistente');

INSERT INTO calificacion (calificador_usuario_id, calificado_usuario_id, velocidad, resistencia, fisico, juego_aereo, control, regate, tiro, pase)
VALUES (pg_temp.u('u01'), pg_temp.u('u02'), 6,6,6,6,6,6,6,6), (pg_temp.u('u03'), pg_temp.u('u02'), 8,8,8,8,8,8,8,8),
       (pg_temp.u('u02'), pg_temp.u('u02'), 10,10,10,10,10,10,10,10);                           -- autocalificación
SELECT ok((SELECT tiro = 7 AND calificaciones = 2 FROM v_radar WHERE usuario_id = pg_temp.u('u02')), 'RN-16: promedio sin la autocalificación');
SELECT throws_like(format($$INSERT INTO calificacion (calificador_usuario_id, calificado_usuario_id, velocidad, resistencia, fisico, juego_aereo, control, regate, tiro, pase) VALUES (%L, %L, 5,5,5,5,5,5,5,5)$$, pg_temp.u('u11'), pg_temp.u('u02')), '%no está habilitado%', 'RN-15: sin partido en común no califica');
UPDATE usuario SET recibe_calificaciones = false WHERE id = pg_temp.u('u04');
SELECT throws_like(format($$INSERT INTO calificacion (calificador_usuario_id, calificado_usuario_id, velocidad, resistencia, fisico, juego_aereo, control, regate, tiro, pase) VALUES (%L, %L, 5,5,5,5,5,5,5,5)$$, pg_temp.u('u01'), pg_temp.u('u04')), '%no está habilitado%', 'RF-124: recepción desactivada');
INSERT INTO nota (autor_usuario_id, destinatario_usuario_id, texto) VALUES (pg_temp.u('u01'), pg_temp.u('u02'), 'Buen pase');

-- ───────────── Reclamo de historial de invitado (RF-112) ─────────────
INSERT INTO usuario (email, nombre_usuario, fecha_nacimiento, estado, email_verificado_en, privacidad_aceptada_en)
VALUES ('tomi@mail.com', 'tomas', '2001-05-05', 'activa', now(), now());
INSERT INTO jugador (usuario_id) SELECT id FROM usuario WHERE nombre_usuario = 'tomas';
SELECT lives_ok(format('SELECT fusionar_invitado(%L, %L)', tomi, (SELECT id FROM usuario WHERE nombre_usuario = 'tomas')), 'RF-112: la fusión corre') FROM inv;
SELECT ok((SELECT pj = 1 AND pp = 1 FROM v_estadisticas_global WHERE usuario_id = (SELECT id FROM usuario WHERE nombre_usuario = 'tomas')), 'RF-112: el historial pasa al usuario');
SELECT ok((SELECT fusionado_a IS NOT NULL AND email IS NULL FROM jugador WHERE id = (SELECT tomi FROM inv)), 'el invitado queda fusionado y sin mail');
SELECT ok((SELECT count(*) = 10 FROM v_participante), 'la fusión no pierde participaciones');

-- ───────────── Auditoría ─────────────
INSERT INTO auditoria (actor_usuario_id, accion, entidad_tipo, entidad_id, grupo_id)
SELECT pg_temp.u('u03'), 'resultado.corregir', 'partido', p, (SELECT g1 FROM g) FROM pj;
SELECT throws_like($$UPDATE auditoria SET accion = 'otra'$$, '%no se modifica%', 'TBD-08: auditoría inmutable');

-- ───────────── Borrado de cuenta (RN-21) ─────────────
-- u03: jugó (claros), está confirmado en el partido futuro, calificó a u02, fue actor de auditoría.
SELECT lives_ok(format('SELECT borrar_cuenta(%L)', pg_temp.u('u03')), 'RN-21: el borrado de cuenta corre');
SELECT ok((SELECT nombre_visible = 'Jugador eliminado' FROM v_jugador WHERE jugador_id = pg_temp.j('u03')), 'figura como "Jugador eliminado"');
SELECT ok((SELECT pg = 1 AND goles = 3 FROM v_estadisticas_grupo WHERE jugador_id = pg_temp.j('agus')), 'las stats de los demás no cambian');
SELECT ok((SELECT count(*) = 10 FROM v_participante), 'el partido pasado conserva a sus 10');
SELECT ok((SELECT estado = 'baja' FROM participacion WHERE jugador_id = pg_temp.j('u03') AND partido_id = (SELECT p FROM pf)), 'libera su lugar en el partido futuro');
SELECT ok((SELECT count(*) = 1 FROM outbox WHERE evento = 'participacion.baja'), 'avisa al worker para ofrecer el lugar');
SELECT ok((SELECT count(*) = 0 FROM v_deuda WHERE jugador_id = pg_temp.j('u03')), 'su deuda desaparece');
SELECT ok((SELECT tiro = 7 AND calificaciones = 2 FROM v_radar WHERE usuario_id = pg_temp.u('u02')), 'sus calificaciones dadas siguen contando');
SELECT ok((SELECT actor_usuario_id IS NULL FROM auditoria), 'la auditoría lo anonimiza');
SELECT ok(NOT EXISTS (SELECT 1 FROM usuario WHERE email = 'u03@mail.com'), 'mail y nombre de usuario borrados');

-- ───────────── Borrado de grupo (RN-23) ─────────────
UPDATE grupo SET borrado_en = now() WHERE id = (SELECT g1 FROM g);
SELECT ok(NOT EXISTS (SELECT 1 FROM v_estadisticas_grupo WHERE grupo_id = (SELECT g1 FROM g)), 'el grupo borrado no muestra stats');
SELECT ok((SELECT pj = 1 FROM v_estadisticas_global WHERE usuario_id = pg_temp.u('agus')), 'las stats globales conservan lo del grupo borrado');

-- ───────────── Series ─────────────
INSERT INTO serie (grupo_id, modalidad, dia_semana, hora, desde) SELECT g2, 'f5', 6, '23:00', current_date FROM g;
INSERT INTO partido (grupo_id, serie_id, fecha_serie, inicio, modalidad, confirmacion_abre_en)
SELECT s.grupo_id, s.id, '2026-10-10', '2026-10-10 23:00-03', 'f5', '2026-10-04 23:00-03' FROM serie s;
SELECT throws_like($$INSERT INTO partido (grupo_id, serie_id, fecha_serie, inicio, modalidad, confirmacion_abre_en)
  SELECT s.grupo_id, s.id, '2026-10-10', '2026-10-10 23:00-03', 'f5', '2026-10-04 23:00-03' FROM serie s$$, '%duplicate key%', 'el worker no duplica instancias');
SELECT throws_like($$UPDATE partido SET cancelado_en = now() WHERE serie_id IS NOT NULL$$, '%cancelado_con_motivo%', 'RF-033: saltear exige motivo');

SELECT * FROM finish();
ROLLBACK;
