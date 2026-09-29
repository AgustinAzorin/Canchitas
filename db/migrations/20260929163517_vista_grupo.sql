-- migrate:up
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;

-- RF-010 a RF-012 y RN-27: el grupo como lo leen los clientes, con la cantidad de miembros
-- vigentes (derivada, no se guarda). Los grupos borrados no aparecen (RN-23).
CREATE VIEW v_grupo AS
SELECT g.id,
       g.nombre,
       g.link_token,
       g.creador_usuario_id,
       g.creado_en,
       count(m.jugador_id) FILTER (WHERE m.salida_en IS NULL)::int AS cantidad_miembros
FROM grupo g
LEFT JOIN miembro m ON m.grupo_id = g.id
WHERE g.borrado_en IS NULL
GROUP BY g.id;

-- migrate:down
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL ROLE canchitas_migrator;
DROP VIEW v_grupo;
