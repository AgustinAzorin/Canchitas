\restrict dbmate

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: estado_cancha; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_cancha AS ENUM (
    'pendiente',
    'publicada',
    'rechazada',
    'baja'
);


--
-- Name: estado_cuenta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_cuenta AS ENUM (
    'sin_verificar',
    'activa'
);


--
-- Name: estado_participacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_participacion AS ENUM (
    'confirmado',
    'en_espera',
    'baja'
);


--
-- Name: estado_solicitud; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.estado_solicitud AS ENUM (
    'pendiente',
    'aprobada',
    'rechazada'
);


--
-- Name: lado_equipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.lado_equipo AS ENUM (
    'A',
    'B'
);


--
-- Name: modalidad; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.modalidad AS ENUM (
    'f5',
    'f7',
    'f8',
    'f11'
);


--
-- Name: motivo_salida; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.motivo_salida AS ENUM (
    'salio',
    'expulsado'
);


--
-- Name: plataforma; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plataforma AS ENUM (
    'android',
    'web'
);


--
-- Name: quien_califica; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quien_califica AS ENUM (
    'grupos',
    'jugaron'
);


--
-- Name: respuesta_oferta; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.respuesta_oferta AS ENUM (
    'aceptada',
    'rechazada',
    'vencida'
);


--
-- Name: rol_grupo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rol_grupo AS ENUM (
    'admin',
    'jugador'
);


--
-- Name: superficie; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.superficie AS ENUM (
    'sintetico',
    'natural',
    'cemento'
);


--
-- Name: tipo_contacto; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_contacto AS ENUM (
    'llamada',
    'whatsapp'
);


--
-- Name: tipo_contenido; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_contenido AS ENUM (
    'resena',
    'nota',
    'cancha'
);


--
-- Name: tipo_notificacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_notificacion AS ENUM (
    'votacion_nueva',
    'votacion_cerrada',
    'partido_confirmado',
    'confirmacion_abierta',
    'recordatorio_24h',
    'recordatorio_2h',
    'lugar_liberado',
    'baja_jugador',
    'resultado_cargado',
    'aval_rechazado',
    'figura_abierta',
    'figura_elegida',
    'deuda_pendiente',
    'calificacion_recibida',
    'nota_recibida',
    'cancha_aprobada',
    'cancha_rechazada',
    'reclamo_aprobado',
    'reclamo_rechazado',
    'agregado_a_grupo'
);


--
-- Name: tipo_votacion; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tipo_votacion AS ENUM (
    'horario',
    'cancha'
);


--
-- Name: visibilidad_perfil; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.visibilidad_perfil AS ENUM (
    'solo_yo',
    'grupos',
    'todos'
);


--
-- Name: borrar_cuenta(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.borrar_cuenta(p_usuario uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: comparten_grupo(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.comparten_grupo(u1 uuid, u2 uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM miembro m1 JOIN jugador j1 ON j1.id = m1.jugador_id
    JOIN miembro m2 ON m2.grupo_id = m1.grupo_id AND m2.salida_en IS NULL
    JOIN jugador j2 ON j2.id = m2.jugador_id
    JOIN grupo g    ON g.id = m1.grupo_id AND g.borrado_en IS NULL
    WHERE j1.usuario_id = u1 AND j2.usuario_id = u2 AND m1.salida_en IS NULL
  )
$$;


--
-- Name: cupo_de(public.modalidad); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cupo_de(m public.modalidad) RETURNS integer
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    AS $$
  SELECT CASE m WHEN 'f5' THEN 10 WHEN 'f7' THEN 14 WHEN 'f8' THEN 16 WHEN 'f11' THEN 22 END
$$;


--
-- Name: es_participante(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.es_participante(p_partido uuid, p_jugador uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM participacion pa JOIN partido p ON p.id = pa.partido_id
    WHERE pa.partido_id = p_partido AND pa.jugador_id = p_jugador
      AND pa.estado = 'confirmado' AND pa.equipo_id IS NOT NULL
      AND p.resultado_cargado_en IS NOT NULL
  )
$$;


--
-- Name: fusionar_invitado(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fusionar_invitado(p_invitado uuid, p_usuario uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: jugaron_juntos(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.jugaron_juntos(u1 uuid, u2 uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
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


--
-- Name: puede_calificar(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.puede_calificar(calificador uuid, calificado uuid) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT u.recibe_calificaciones
     AND jugaron_juntos(calificador, calificado)
     AND (u.quien_califica = 'jugaron' OR comparten_grupo(calificador, calificado))
  FROM usuario u WHERE u.id = calificado
$$;


--
-- Name: tg_admin_requiere_cuenta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_admin_requiere_cuenta() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.rol = 'admin' AND NOT EXISTS (
    SELECT 1 FROM jugador WHERE id = NEW.jugador_id AND usuario_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'solo un usuario registrado puede ser admin' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: tg_auditoria_inmutable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_auditoria_inmutable() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.actor_usuario_id IS NULL
     AND (to_jsonb(NEW) - 'actor_usuario_id') = (to_jsonb(OLD) - 'actor_usuario_id') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'la auditoría no se modifica' USING ERRCODE = 'insufficient_privilege';
END $$;


--
-- Name: tg_aval_valido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_aval_valido() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_calificacion_valida(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_calificacion_valida() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_denuncia_ocultar(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_denuncia_ocultar() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_invitado_en_su_grupo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_invitado_en_su_grupo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_nota_valida(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_nota_valida() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NOT puede_calificar(NEW.autor_usuario_id, NEW.destinatario_usuario_id) THEN
    RAISE EXCEPTION 'no está habilitado para dejarle una nota' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


--
-- Name: tg_participacion_cupo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_participacion_cupo() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_resena_valida(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_resena_valida() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_voto_figura_valido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_voto_figura_valido() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


--
-- Name: tg_voto_valido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_voto_valido() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: votacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.votacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo_id uuid NOT NULL,
    tipo public.tipo_votacion NOT NULL,
    creada_por uuid,
    cierra_en timestamp with time zone,
    cerrada_en timestamp with time zone,
    opcion_ganadora_id uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cierre_futuro CHECK (((cierra_en IS NULL) OR (cierra_en > creado_en)))
);


--
-- Name: votacion_abierta(public.votacion); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.votacion_abierta(v public.votacion) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  SELECT v.cerrada_en IS NULL AND v.opcion_ganadora_id IS NULL
     AND (v.cierra_en IS NULL OR now() < v.cierra_en)
$$;


--
-- Name: auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auditoria (
    id bigint NOT NULL,
    actor_usuario_id uuid,
    accion text NOT NULL,
    entidad_tipo text NOT NULL,
    entidad_id uuid NOT NULL,
    grupo_id uuid,
    datos jsonb DEFAULT '{}'::jsonb NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: auditoria_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.auditoria ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.auditoria_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: aval; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aval (
    partido_id uuid NOT NULL,
    jugador_id uuid NOT NULL,
    version integer NOT NULL,
    correcto boolean NOT NULL,
    avalado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: baja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.baja (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partido_id uuid NOT NULL,
    jugador_id uuid NOT NULL,
    baja_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: calificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calificador_usuario_id uuid,
    calificado_usuario_id uuid NOT NULL,
    velocidad smallint NOT NULL,
    resistencia smallint NOT NULL,
    fisico smallint NOT NULL,
    juego_aereo smallint NOT NULL,
    control smallint NOT NULL,
    regate smallint NOT NULL,
    tiro smallint NOT NULL,
    pase smallint NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calificacion_control_check CHECK (((control >= 1) AND (control <= 10))),
    CONSTRAINT calificacion_fisico_check CHECK (((fisico >= 1) AND (fisico <= 10))),
    CONSTRAINT calificacion_juego_aereo_check CHECK (((juego_aereo >= 1) AND (juego_aereo <= 10))),
    CONSTRAINT calificacion_pase_check CHECK (((pase >= 1) AND (pase <= 10))),
    CONSTRAINT calificacion_regate_check CHECK (((regate >= 1) AND (regate <= 10))),
    CONSTRAINT calificacion_resistencia_check CHECK (((resistencia >= 1) AND (resistencia <= 10))),
    CONSTRAINT calificacion_tiro_check CHECK (((tiro >= 1) AND (tiro <= 10))),
    CONSTRAINT calificacion_velocidad_check CHECK (((velocidad >= 1) AND (velocidad <= 10)))
);


--
-- Name: cancha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancha (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    complejo_id uuid,
    nombre text NOT NULL,
    direccion text NOT NULL,
    zona text,
    ubicacion public.geography(Point,4326),
    telefono text,
    whatsapp text,
    modalidades public.modalidad[] DEFAULT '{}'::public.modalidad[] NOT NULL,
    superficies public.superficie[] DEFAULT '{}'::public.superficie[] NOT NULL,
    techada boolean DEFAULT false NOT NULL,
    precio_hora integer,
    estado public.estado_cancha DEFAULT 'pendiente'::public.estado_cancha NOT NULL,
    propuesta_por uuid,
    revisada_por uuid,
    revisada_en timestamp with time zone,
    oculto_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cancha_nombre_check CHECK (((length(btrim(nombre)) >= 1) AND (length(btrim(nombre)) <= 80))),
    CONSTRAINT cancha_precio_hora_check CHECK ((precio_hora > 0)),
    CONSTRAINT contacto_whatsapp CHECK (((whatsapp IS NULL) OR (whatsapp ~ '^[0-9]{10,15}$'::text))),
    CONSTRAINT publicada_con_ubicacion CHECK (((estado <> 'publicada'::public.estado_cancha) OR (ubicacion IS NOT NULL)))
);


--
-- Name: cancha_foto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cancha_foto (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cancha_id uuid NOT NULL,
    storage_key text NOT NULL,
    orden smallint DEFAULT 0 NOT NULL,
    subida_por uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: complejo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.complejo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    encargado_usuario_id uuid,
    verificado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT verificado_con_encargado CHECK (((verificado_en IS NULL) OR (encargado_usuario_id IS NOT NULL)))
);


--
-- Name: contacto_cancha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacto_cancha (
    id bigint NOT NULL,
    cancha_id uuid NOT NULL,
    usuario_id uuid,
    tipo public.tipo_contacto NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: contacto_cancha_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.contacto_cancha ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.contacto_cancha_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: denuncia; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.denuncia (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo public.tipo_contenido NOT NULL,
    contenido_id uuid NOT NULL,
    denunciante_id uuid NOT NULL,
    motivo text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    resuelta_en timestamp with time zone,
    resuelta_por uuid,
    resolucion text,
    CONSTRAINT denuncia_motivo_check CHECK ((length(motivo) <= 500)),
    CONSTRAINT denuncia_resolucion_check CHECK ((resolucion = ANY (ARRAY['eliminado'::text, 'restaurado'::text]))),
    CONSTRAINT resolucion_coherente CHECK (((resuelta_en IS NULL) = (resolucion IS NULL)))
);


--
-- Name: dispositivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dispositivo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    plataforma public.plataforma NOT NULL,
    push_token text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    ultimo_uso_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grupo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre text NOT NULL,
    creador_usuario_id uuid,
    link_token text NOT NULL,
    link_regenerado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    borrado_en timestamp with time zone,
    CONSTRAINT grupo_nombre_check CHECK (((length(btrim(nombre)) >= 1) AND (length(btrim(nombre)) <= 60)))
);


--
-- Name: invitado_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitado_token (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    jugador_id uuid NOT NULL,
    proposito text NOT NULL,
    token_hash bytea NOT NULL,
    expira_en timestamp with time zone NOT NULL,
    usado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invitado_token_proposito_check CHECK ((proposito = ANY (ARRAY['verificacion'::text, 'sesion'::text])))
);


--
-- Name: jugador; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.jugador (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    grupo_invitado_id uuid,
    nombre text,
    email public.citext,
    email_verificado_en timestamp with time zone,
    eliminado_en timestamp with time zone,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    fusionado_a uuid,
    CONSTRAINT jugador_nombre_check CHECK (((length(btrim(nombre)) >= 1) AND (length(btrim(nombre)) <= 40))),
    CONSTRAINT tipo_de_jugador CHECK ((((usuario_id IS NOT NULL) AND (grupo_invitado_id IS NULL) AND (nombre IS NULL) AND (email IS NULL) AND (eliminado_en IS NULL)) OR ((usuario_id IS NULL) AND (eliminado_en IS NULL) AND (grupo_invitado_id IS NOT NULL) AND (nombre IS NOT NULL)) OR ((usuario_id IS NULL) AND (eliminado_en IS NOT NULL) AND (nombre IS NULL) AND (email IS NULL) AND (email_verificado_en IS NULL)))),
    CONSTRAINT verificado_requiere_email CHECK (((email_verificado_en IS NULL) OR (email IS NOT NULL)))
);


--
-- Name: metrica_diaria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metrica_diaria (
    fecha date NOT NULL,
    clave text NOT NULL,
    valor bigint NOT NULL
);


--
-- Name: miembro; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.miembro (
    grupo_id uuid NOT NULL,
    jugador_id uuid NOT NULL,
    rol public.rol_grupo DEFAULT 'jugador'::public.rol_grupo NOT NULL,
    unido_en timestamp with time zone DEFAULT now() NOT NULL,
    salida_en timestamp with time zone,
    motivo_salida public.motivo_salida,
    silenciado boolean DEFAULT false NOT NULL,
    CONSTRAINT salida_coherente CHECK (((salida_en IS NULL) = (motivo_salida IS NULL)))
);


--
-- Name: nota; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nota (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    autor_usuario_id uuid NOT NULL,
    destinatario_usuario_id uuid NOT NULL,
    texto text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    oculto_en timestamp with time zone,
    CONSTRAINT no_autonota CHECK ((autor_usuario_id <> destinatario_usuario_id)),
    CONSTRAINT nota_texto_check CHECK (((length(btrim(texto)) >= 1) AND (length(btrim(texto)) <= 500)))
);


--
-- Name: notificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    tipo public.tipo_notificacion NOT NULL,
    grupo_id uuid,
    partido_id uuid,
    datos jsonb DEFAULT '{}'::jsonb NOT NULL,
    creada_en timestamp with time zone DEFAULT now() NOT NULL,
    leida_en timestamp with time zone
);


--
-- Name: notificacion_desactivada; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacion_desactivada (
    usuario_id uuid NOT NULL,
    tipo public.tipo_notificacion NOT NULL
);


--
-- Name: opcion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opcion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    votacion_id uuid NOT NULL,
    tipo public.tipo_votacion NOT NULL,
    inicio timestamp with time zone,
    cancha_id uuid,
    cancha_texto text,
    orden smallint DEFAULT 0 NOT NULL,
    CONSTRAINT opcion_cancha_texto_check CHECK (((length(btrim(cancha_texto)) >= 1) AND (length(btrim(cancha_texto)) <= 120))),
    CONSTRAINT opcion_segun_tipo CHECK ((((tipo = 'horario'::public.tipo_votacion) AND (inicio IS NOT NULL) AND (cancha_id IS NULL) AND (cancha_texto IS NULL)) OR ((tipo = 'cancha'::public.tipo_votacion) AND (inicio IS NULL) AND ((cancha_id IS NULL) <> (cancha_texto IS NULL)))))
);


--
-- Name: outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox (
    id bigint NOT NULL,
    evento text NOT NULL,
    agregado_tipo text NOT NULL,
    agregado_id uuid NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    procesado_en timestamp with time zone,
    intentos smallint DEFAULT 0 NOT NULL,
    ultimo_error text
);


--
-- Name: outbox_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.outbox ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.outbox_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: participacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participacion (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partido_id uuid NOT NULL,
    jugador_id uuid NOT NULL,
    estado public.estado_participacion NOT NULL,
    confirmado_en timestamp with time zone DEFAULT clock_timestamp() NOT NULL,
    equipo_id uuid,
    goles smallint DEFAULT 0 NOT NULL,
    asistencias smallint DEFAULT 0 NOT NULL,
    oferta_enviada_en timestamp with time zone,
    oferta_vence_en timestamp with time zone,
    oferta_respuesta public.respuesta_oferta,
    pagado_en timestamp with time zone,
    pago_marcado_por uuid,
    CONSTRAINT equipo_solo_confirmados CHECK (((equipo_id IS NULL) OR (estado = 'confirmado'::public.estado_participacion))),
    CONSTRAINT oferta_coherente CHECK (((oferta_enviada_en IS NULL) = (oferta_vence_en IS NULL))),
    CONSTRAINT pago_coherente CHECK (((pagado_en IS NULL) OR (estado = 'confirmado'::public.estado_participacion))),
    CONSTRAINT participacion_asistencias_check CHECK ((asistencias >= 0)),
    CONSTRAINT participacion_goles_check CHECK ((goles >= 0)),
    CONSTRAINT respuesta_con_oferta CHECK (((oferta_respuesta IS NULL) OR (oferta_enviada_en IS NOT NULL)))
);


--
-- Name: partido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partido (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo_id uuid NOT NULL,
    serie_id uuid,
    fecha_serie date,
    inicio timestamp with time zone NOT NULL,
    modalidad public.modalidad NOT NULL,
    cancha_id uuid,
    cancha_texto text,
    confirmacion_abre_en timestamp with time zone NOT NULL,
    votacion_horario_id uuid,
    votacion_cancha_id uuid,
    cancelado_en timestamp with time zone,
    cancelado_por uuid,
    motivo_cancelacion text,
    resultado_cargado_en timestamp with time zone,
    resultado_version integer DEFAULT 0 NOT NULL,
    costo_total integer,
    creado_por uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT abre_antes_del_inicio CHECK ((confirmacion_abre_en <= inicio)),
    CONSTRAINT cancelado_con_motivo CHECK (((cancelado_en IS NULL) OR (COALESCE(length(btrim(motivo_cancelacion)), 0) > 0))),
    CONSTRAINT cancelado_o_jugado CHECK (((cancelado_en IS NULL) OR (resultado_cargado_en IS NULL))),
    CONSTRAINT instancia_coherente CHECK (((serie_id IS NULL) = (fecha_serie IS NULL))),
    CONSTRAINT partido_cancha_texto_check CHECK (((length(btrim(cancha_texto)) >= 1) AND (length(btrim(cancha_texto)) <= 120))),
    CONSTRAINT partido_costo_total_check CHECK ((costo_total > 0)),
    CONSTRAINT resultado_despues_del_inicio CHECK (((resultado_cargado_en IS NULL) OR (resultado_cargado_en >= inicio))),
    CONSTRAINT una_cancha CHECK (((cancha_id IS NULL) OR (cancha_texto IS NULL))),
    CONSTRAINT version_coherente CHECK (((resultado_version = 0) = (resultado_cargado_en IS NULL)))
);


--
-- Name: partido_equipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partido_equipo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partido_id uuid NOT NULL,
    lado public.lado_equipo NOT NULL,
    nombre text NOT NULL,
    grupo_id uuid,
    goles smallint,
    CONSTRAINT partido_equipo_goles_check CHECK ((goles >= 0))
);


--
-- Name: reclamo_complejo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reclamo_complejo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cancha_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    estado public.estado_solicitud DEFAULT 'pendiente'::public.estado_solicitud NOT NULL,
    evidencia text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    revisado_por uuid,
    revisado_en timestamp with time zone
);


--
-- Name: reporte_cancha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reporte_cancha (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cancha_id uuid NOT NULL,
    usuario_id uuid,
    motivo text NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    resuelto_por uuid,
    resuelto_en timestamp with time zone,
    CONSTRAINT reporte_cancha_motivo_check CHECK (((length(btrim(motivo)) >= 1) AND (length(btrim(motivo)) <= 500)))
);


--
-- Name: resena; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resena (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cancha_id uuid NOT NULL,
    autor_usuario_id uuid NOT NULL,
    puntaje smallint NOT NULL,
    texto text,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    editado_en timestamp with time zone,
    oculto_en timestamp with time zone,
    CONSTRAINT resena_puntaje_check CHECK (((puntaje >= 1) AND (puntaje <= 5))),
    CONSTRAINT resena_texto_check CHECK ((length(texto) <= 1000))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: serie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.serie (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo_id uuid NOT NULL,
    modalidad public.modalidad NOT NULL,
    dia_semana smallint NOT NULL,
    hora time without time zone NOT NULL,
    zona_horaria text DEFAULT 'America/Argentina/Buenos_Aires'::text NOT NULL,
    cancha_id uuid,
    cancha_texto text,
    desde date NOT NULL,
    hasta date,
    reemplaza_a uuid,
    creada_por uuid,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rango_valido CHECK (((hasta IS NULL) OR (hasta >= desde))),
    CONSTRAINT serie_dia_semana_check CHECK (((dia_semana >= 1) AND (dia_semana <= 7))),
    CONSTRAINT una_cancha CHECK (((cancha_id IS NULL) OR (cancha_texto IS NULL)))
);


--
-- Name: solicitud_historial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitud_historial (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invitado_jugador_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    estado public.estado_solicitud DEFAULT 'pendiente'::public.estado_solicitud NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    revisado_por uuid,
    revisado_en timestamp with time zone
);


--
-- Name: usuario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email public.citext NOT NULL,
    nombre_usuario public.citext NOT NULL,
    fecha_nacimiento date NOT NULL,
    estado public.estado_cuenta DEFAULT 'sin_verificar'::public.estado_cuenta NOT NULL,
    email_verificado_en timestamp with time zone,
    privacidad_aceptada_en timestamp with time zone NOT NULL,
    recibe_calificaciones boolean DEFAULT true NOT NULL,
    quien_califica public.quien_califica DEFAULT 'grupos'::public.quien_califica NOT NULL,
    visibilidad_perfil public.visibilidad_perfil DEFAULT 'grupos'::public.visibilidad_perfil NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mayor_de_edad CHECK ((fecha_nacimiento <= (((creado_en AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date - '18 years'::interval))),
    CONSTRAINT usuario_nombre_usuario_check CHECK ((nombre_usuario OPERATOR(public.~) '^[a-z0-9_.]{3,20}$'::public.citext)),
    CONSTRAINT verificacion_coherente CHECK (((estado = 'activa'::public.estado_cuenta) = (email_verificado_en IS NOT NULL)))
);


--
-- Name: v_avales; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_avales AS
 SELECT p.id AS partido_id,
    count(a.*) FILTER (WHERE a.correcto) AS avales,
    count(a.*) FILTER (WHERE (NOT a.correcto)) AS rechazos
   FROM (public.partido p
     LEFT JOIN public.aval a ON (((a.partido_id = p.id) AND (a.version = p.resultado_version))))
  WHERE (p.resultado_cargado_en IS NOT NULL)
  GROUP BY p.id;


--
-- Name: v_baja; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_baja AS
 SELECT b.id,
    b.partido_id,
    b.jugador_id,
    b.baja_en,
    p.grupo_id,
    p.inicio,
    (p.inicio - b.baja_en) AS antelacion
   FROM (public.baja b
     JOIN public.partido p ON ((p.id = b.partido_id)));


--
-- Name: v_cancha_publica; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_cancha_publica AS
 SELECT c.id,
    c.nombre,
    c.direccion,
    c.zona,
    c.ubicacion,
    c.telefono,
    c.whatsapp,
    c.modalidades,
    c.superficies,
    c.techada,
        CASE
            WHEN (cx.verificado_en IS NOT NULL) THEN c.precio_hora
            ELSE NULL::integer
        END AS precio_hora,
    (cx.verificado_en IS NOT NULL) AS complejo_registrado,
    r.puntaje,
    COALESCE(r.resenas, (0)::bigint) AS resenas
   FROM ((public.cancha c
     LEFT JOIN public.complejo cx ON ((cx.id = c.complejo_id)))
     LEFT JOIN LATERAL ( SELECT round(avg(resena.puntaje), 1) AS puntaje,
            count(*) AS resenas
           FROM public.resena
          WHERE ((resena.cancha_id = c.id) AND (resena.oculto_en IS NULL))) r ON (true))
  WHERE ((c.estado = 'publicada'::public.estado_cancha) AND (c.oculto_en IS NULL));


--
-- Name: v_participante; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_participante AS
 SELECT pa.partido_id,
    pa.jugador_id,
    COALESCE(eq.grupo_id, p.grupo_id) AS grupo_id,
    p.inicio,
    p.cancha_id,
    pa.goles,
    pa.asistencias,
    eq.goles AS goles_favor,
    rv.goles AS goles_contra,
        CASE
            WHEN (eq.goles > rv.goles) THEN 'G'::text
            WHEN (eq.goles = rv.goles) THEN 'E'::text
            ELSE 'P'::text
        END AS resultado
   FROM (((public.participacion pa
     JOIN public.partido p ON ((p.id = pa.partido_id)))
     JOIN public.partido_equipo eq ON ((eq.id = pa.equipo_id)))
     JOIN public.partido_equipo rv ON (((rv.partido_id = p.id) AND (rv.lado <> eq.lado))))
  WHERE ((pa.estado = 'confirmado'::public.estado_participacion) AND (p.resultado_cargado_en IS NOT NULL) AND (p.cancelado_en IS NULL));


--
-- Name: v_parte; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_parte AS
 SELECT vp.partido_id,
    vp.jugador_id,
    p.grupo_id,
    (ceil(((p.costo_total)::numeric / (count(*) OVER (PARTITION BY vp.partido_id))::numeric)))::integer AS parte,
    pa.pagado_en
   FROM ((public.v_participante vp
     JOIN public.partido p ON ((p.id = vp.partido_id)))
     JOIN public.participacion pa ON (((pa.partido_id = vp.partido_id) AND (pa.jugador_id = vp.jugador_id))))
  WHERE (p.costo_total IS NOT NULL);


--
-- Name: v_deuda; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_deuda AS
 SELECT pt.grupo_id,
    pt.jugador_id,
    (sum(pt.parte))::integer AS deuda
   FROM (public.v_parte pt
     JOIN public.jugador j ON (((j.id = pt.jugador_id) AND (j.eliminado_en IS NULL))))
  WHERE (pt.pagado_en IS NULL)
  GROUP BY pt.grupo_id, pt.jugador_id;


--
-- Name: voto_figura; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voto_figura (
    partido_id uuid NOT NULL,
    votante_id uuid NOT NULL,
    votado_id uuid NOT NULL,
    votado_en timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT no_autovoto CHECK ((votante_id <> votado_id))
);


--
-- Name: v_figura; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_figura AS
 WITH conteo AS (
         SELECT vf.partido_id,
            vf.votado_id AS jugador_id,
            count(*) AS votos
           FROM public.voto_figura vf
          GROUP BY vf.partido_id, vf.votado_id
        ), rankeado AS (
         SELECT c.partido_id,
            c.jugador_id,
            c.votos,
            rank() OVER (PARTITION BY c.partido_id ORDER BY c.votos DESC) AS puesto
           FROM conteo c
        )
 SELECT r.partido_id,
    r.jugador_id,
    r.votos,
    (now() >= (p.resultado_cargado_en + '48:00:00'::interval)) AS cerrada
   FROM (rankeado r
     JOIN public.partido p ON ((p.id = r.partido_id)))
  WHERE (r.puesto = 1);


--
-- Name: v_estadisticas_global; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_estadisticas_global AS
 SELECT j.usuario_id,
    count(*) AS pj,
    count(*) FILTER (WHERE (vp.resultado = 'G'::text)) AS pg,
    count(*) FILTER (WHERE (vp.resultado = 'E'::text)) AS pe,
    count(*) FILTER (WHERE (vp.resultado = 'P'::text)) AS pp,
    (sum(vp.goles))::integer AS goles,
    (sum(vp.asistencias))::integer AS asistencias,
    count(f.jugador_id) FILTER (WHERE f.cerrada) AS figuras
   FROM ((public.v_participante vp
     JOIN public.jugador j ON (((j.id = vp.jugador_id) AND (j.usuario_id IS NOT NULL))))
     LEFT JOIN public.v_figura f ON (((f.partido_id = vp.partido_id) AND (f.jugador_id = vp.jugador_id))))
  GROUP BY j.usuario_id;


--
-- Name: v_estadisticas_grupo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_estadisticas_grupo AS
 SELECT vp.grupo_id,
    vp.jugador_id,
    count(*) AS pj,
    count(*) FILTER (WHERE (vp.resultado = 'G'::text)) AS pg,
    count(*) FILTER (WHERE (vp.resultado = 'E'::text)) AS pe,
    count(*) FILTER (WHERE (vp.resultado = 'P'::text)) AS pp,
    (sum(vp.goles))::integer AS goles,
    (sum(vp.asistencias))::integer AS asistencias,
    count(f.jugador_id) FILTER (WHERE f.cerrada) AS figuras
   FROM ((public.v_participante vp
     JOIN public.grupo g ON (((g.id = vp.grupo_id) AND (g.borrado_en IS NULL))))
     LEFT JOIN public.v_figura f ON (((f.partido_id = vp.partido_id) AND (f.jugador_id = vp.jugador_id))))
  GROUP BY vp.grupo_id, vp.jugador_id;


--
-- Name: v_grupo_activo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_grupo_activo AS
 SELECT p.grupo_id,
    count(*) AS partidos_30d
   FROM (public.partido p
     JOIN public.grupo g ON (((g.id = p.grupo_id) AND (g.borrado_en IS NULL))))
  WHERE ((p.cancelado_en IS NULL) AND (p.inicio >= (now() - '30 days'::interval)) AND (p.inicio <= now()))
  GROUP BY p.grupo_id
 HAVING (count(*) >= 2);


--
-- Name: v_jugador; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_jugador AS
 SELECT j.id AS jugador_id,
    j.usuario_id,
        CASE
            WHEN (j.eliminado_en IS NOT NULL) THEN 'Jugador eliminado'::text
            WHEN (j.usuario_id IS NOT NULL) THEN (u.nombre_usuario)::text
            ELSE j.nombre
        END AS nombre_visible,
    ((j.usuario_id IS NULL) AND (j.eliminado_en IS NULL)) AS es_invitado,
    (j.eliminado_en IS NOT NULL) AS eliminado,
    j.fusionado_a
   FROM (public.jugador j
     LEFT JOIN public.usuario u ON ((u.id = j.usuario_id)));


--
-- Name: v_lista_espera; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_lista_espera AS
 SELECT partido_id,
    jugador_id,
    confirmado_en,
    oferta_vence_en,
    oferta_respuesta,
    row_number() OVER (PARTITION BY partido_id ORDER BY confirmado_en, id) AS posicion
   FROM public.participacion pa
  WHERE ((estado = 'en_espera'::public.estado_participacion) AND (oferta_respuesta IS DISTINCT FROM 'vencida'::public.respuesta_oferta) AND (oferta_respuesta IS DISTINCT FROM 'rechazada'::public.respuesta_oferta));


--
-- Name: v_partido; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_partido AS
 SELECT p.id,
    p.grupo_id,
    p.serie_id,
    p.fecha_serie,
    p.inicio,
    p.modalidad,
    p.cancha_id,
    p.cancha_texto,
    p.confirmacion_abre_en,
    p.votacion_horario_id,
    p.votacion_cancha_id,
    p.cancelado_en,
    p.cancelado_por,
    p.motivo_cancelacion,
    p.resultado_cargado_en,
    p.resultado_version,
    p.costo_total,
    p.creado_por,
    p.creado_en,
    public.cupo_de(p.modalidad) AS cupo,
    c.confirmados,
    c.en_espera,
        CASE
            WHEN (p.cancelado_en IS NOT NULL) THEN 'cancelado'::text
            WHEN (p.resultado_cargado_en IS NOT NULL) THEN 'jugado'::text
            WHEN (now() < p.confirmacion_abre_en) THEN 'programado'::text
            WHEN (c.confirmados >= public.cupo_de(p.modalidad)) THEN 'completo'::text
            ELSE 'confirmacion_abierta'::text
        END AS estado
   FROM (public.partido p
     CROSS JOIN LATERAL ( SELECT count(*) FILTER (WHERE (participacion.estado = 'confirmado'::public.estado_participacion)) AS confirmados,
            count(*) FILTER (WHERE (participacion.estado = 'en_espera'::public.estado_participacion)) AS en_espera
           FROM public.participacion
          WHERE (participacion.partido_id = p.id)) c);


--
-- Name: v_radar; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_radar AS
 SELECT calificado_usuario_id AS usuario_id,
    count(*) AS calificaciones,
    round(avg(velocidad), 1) AS velocidad,
    round(avg(resistencia), 1) AS resistencia,
    round(avg(fisico), 1) AS fisico,
    round(avg(juego_aereo), 1) AS juego_aereo,
    round(avg(control), 1) AS control,
    round(avg(regate), 1) AS regate,
    round(avg(tiro), 1) AS tiro,
    round(avg(pase), 1) AS pase
   FROM public.calificacion c
  WHERE (calificador_usuario_id IS DISTINCT FROM calificado_usuario_id)
  GROUP BY calificado_usuario_id;


--
-- Name: voto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voto (
    opcion_id uuid NOT NULL,
    jugador_id uuid NOT NULL,
    votado_en timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: v_votacion_resultado; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_votacion_resultado AS
 WITH conteo AS (
         SELECT o.votacion_id,
            o.id AS opcion_id,
            count(vt.jugador_id) AS votos
           FROM (public.opcion o
             LEFT JOIN public.voto vt ON ((vt.opcion_id = o.id)))
          GROUP BY o.votacion_id, o.id
        )
 SELECT c.votacion_id,
    c.opcion_id,
    c.votos,
    ((c.votos = max(c.votos) OVER w) AND (c.votos > 0)) AS primera,
    (count(*) FILTER (WHERE ((c.votos = m.maximo) AND (m.maximo > 0))) OVER w > 1) AS hay_empate,
    public.votacion_abierta(v.*) AS abierta
   FROM ((conteo c
     JOIN public.votacion v ON ((v.id = c.votacion_id)))
     JOIN ( SELECT conteo.votacion_id,
            max(conteo.votos) AS maximo
           FROM conteo
          GROUP BY conteo.votacion_id) m ON ((m.votacion_id = c.votacion_id)))
  WINDOW w AS (PARTITION BY c.votacion_id);


--
-- Name: auditoria auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_pkey PRIMARY KEY (id);


--
-- Name: aval aval_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aval
    ADD CONSTRAINT aval_pkey PRIMARY KEY (partido_id, jugador_id);


--
-- Name: baja baja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja
    ADD CONSTRAINT baja_pkey PRIMARY KEY (id);


--
-- Name: calificacion calificacion_calificador_usuario_id_calificado_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_calificador_usuario_id_calificado_usuario_id_key UNIQUE (calificador_usuario_id, calificado_usuario_id);


--
-- Name: calificacion calificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_pkey PRIMARY KEY (id);


--
-- Name: cancha_foto cancha_foto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha_foto
    ADD CONSTRAINT cancha_foto_pkey PRIMARY KEY (id);


--
-- Name: cancha_foto cancha_foto_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha_foto
    ADD CONSTRAINT cancha_foto_storage_key_key UNIQUE (storage_key);


--
-- Name: cancha cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_pkey PRIMARY KEY (id);


--
-- Name: complejo complejo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complejo
    ADD CONSTRAINT complejo_pkey PRIMARY KEY (id);


--
-- Name: contacto_cancha contacto_cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacto_cancha
    ADD CONSTRAINT contacto_cancha_pkey PRIMARY KEY (id);


--
-- Name: denuncia denuncia_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncia
    ADD CONSTRAINT denuncia_pkey PRIMARY KEY (id);


--
-- Name: denuncia denuncia_tipo_contenido_id_denunciante_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncia
    ADD CONSTRAINT denuncia_tipo_contenido_id_denunciante_id_key UNIQUE (tipo, contenido_id, denunciante_id);


--
-- Name: dispositivo dispositivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo
    ADD CONSTRAINT dispositivo_pkey PRIMARY KEY (id);


--
-- Name: dispositivo dispositivo_push_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo
    ADD CONSTRAINT dispositivo_push_token_key UNIQUE (push_token);


--
-- Name: grupo grupo_link_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT grupo_link_token_key UNIQUE (link_token);


--
-- Name: grupo grupo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT grupo_pkey PRIMARY KEY (id);


--
-- Name: invitado_token invitado_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitado_token
    ADD CONSTRAINT invitado_token_pkey PRIMARY KEY (id);


--
-- Name: invitado_token invitado_token_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitado_token
    ADD CONSTRAINT invitado_token_token_hash_key UNIQUE (token_hash);


--
-- Name: jugador jugador_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jugador
    ADD CONSTRAINT jugador_pkey PRIMARY KEY (id);


--
-- Name: jugador jugador_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jugador
    ADD CONSTRAINT jugador_usuario_id_key UNIQUE (usuario_id);


--
-- Name: metrica_diaria metrica_diaria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metrica_diaria
    ADD CONSTRAINT metrica_diaria_pkey PRIMARY KEY (fecha, clave);


--
-- Name: miembro miembro_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.miembro
    ADD CONSTRAINT miembro_pkey PRIMARY KEY (grupo_id, jugador_id);


--
-- Name: nota nota_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota
    ADD CONSTRAINT nota_pkey PRIMARY KEY (id);


--
-- Name: notificacion_desactivada notificacion_desactivada_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion_desactivada
    ADD CONSTRAINT notificacion_desactivada_pkey PRIMARY KEY (usuario_id, tipo);


--
-- Name: notificacion notificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_pkey PRIMARY KEY (id);


--
-- Name: opcion opcion_id_votacion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opcion
    ADD CONSTRAINT opcion_id_votacion_id_key UNIQUE (id, votacion_id);


--
-- Name: opcion opcion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opcion
    ADD CONSTRAINT opcion_pkey PRIMARY KEY (id);


--
-- Name: outbox outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox
    ADD CONSTRAINT outbox_pkey PRIMARY KEY (id);


--
-- Name: participacion participacion_partido_id_jugador_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacion
    ADD CONSTRAINT participacion_partido_id_jugador_id_key UNIQUE (partido_id, jugador_id);


--
-- Name: participacion participacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacion
    ADD CONSTRAINT participacion_pkey PRIMARY KEY (id);


--
-- Name: partido_equipo partido_equipo_id_partido_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido_equipo
    ADD CONSTRAINT partido_equipo_id_partido_id_key UNIQUE (id, partido_id);


--
-- Name: partido_equipo partido_equipo_partido_id_lado_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido_equipo
    ADD CONSTRAINT partido_equipo_partido_id_lado_key UNIQUE (partido_id, lado);


--
-- Name: partido_equipo partido_equipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido_equipo
    ADD CONSTRAINT partido_equipo_pkey PRIMARY KEY (id);


--
-- Name: partido partido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_pkey PRIMARY KEY (id);


--
-- Name: partido partido_serie_id_fecha_serie_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_serie_id_fecha_serie_key UNIQUE (serie_id, fecha_serie);


--
-- Name: reclamo_complejo reclamo_complejo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reclamo_complejo
    ADD CONSTRAINT reclamo_complejo_pkey PRIMARY KEY (id);


--
-- Name: reporte_cancha reporte_cancha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_cancha
    ADD CONSTRAINT reporte_cancha_pkey PRIMARY KEY (id);


--
-- Name: resena resena_cancha_id_autor_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_cancha_id_autor_usuario_id_key UNIQUE (cancha_id, autor_usuario_id);


--
-- Name: resena resena_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: serie serie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serie
    ADD CONSTRAINT serie_pkey PRIMARY KEY (id);


--
-- Name: solicitud_historial solicitud_historial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_historial
    ADD CONSTRAINT solicitud_historial_pkey PRIMARY KEY (id);


--
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- Name: usuario usuario_nombre_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_nombre_usuario_key UNIQUE (nombre_usuario);


--
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id);


--
-- Name: votacion votacion_id_tipo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votacion
    ADD CONSTRAINT votacion_id_tipo_key UNIQUE (id, tipo);


--
-- Name: votacion votacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votacion
    ADD CONSTRAINT votacion_pkey PRIMARY KEY (id);


--
-- Name: voto_figura voto_figura_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voto_figura
    ADD CONSTRAINT voto_figura_pkey PRIMARY KEY (partido_id, votante_id);


--
-- Name: voto voto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voto
    ADD CONSTRAINT voto_pkey PRIMARY KEY (opcion_id, jugador_id);


--
-- Name: auditoria_entidad_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_entidad_idx ON public.auditoria USING btree (entidad_tipo, entidad_id);


--
-- Name: auditoria_grupo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX auditoria_grupo_idx ON public.auditoria USING btree (grupo_id, creado_en DESC);


--
-- Name: baja_jugador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX baja_jugador_idx ON public.baja USING btree (jugador_id, baja_en DESC);


--
-- Name: calificacion_calificado_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calificacion_calificado_idx ON public.calificacion USING btree (calificado_usuario_id);


--
-- Name: cancha_modalidades_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancha_modalidades_idx ON public.cancha USING gin (modalidades);


--
-- Name: cancha_pendientes_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancha_pendientes_idx ON public.cancha USING btree (creado_en) WHERE (estado = 'pendiente'::public.estado_cancha);


--
-- Name: cancha_superficies_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancha_superficies_idx ON public.cancha USING gin (superficies);


--
-- Name: cancha_ubicacion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cancha_ubicacion_idx ON public.cancha USING gist (ubicacion) WHERE (estado = 'publicada'::public.estado_cancha);


--
-- Name: contacto_cancha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contacto_cancha_idx ON public.contacto_cancha USING btree (cancha_id, creado_en);


--
-- Name: denuncia_pendiente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX denuncia_pendiente_idx ON public.denuncia USING btree (tipo, contenido_id) WHERE (resuelta_en IS NULL);


--
-- Name: dispositivo_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX dispositivo_usuario_idx ON public.dispositivo USING btree (usuario_id);


--
-- Name: jugador_invitado_email_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX jugador_invitado_email_uq ON public.jugador USING btree (grupo_invitado_id, email) WHERE (email IS NOT NULL);


--
-- Name: jugador_invitado_nombre_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX jugador_invitado_nombre_uq ON public.jugador USING btree (grupo_invitado_id, lower(nombre)) WHERE (nombre IS NOT NULL);


--
-- Name: miembro_jugador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX miembro_jugador_idx ON public.miembro USING btree (jugador_id) WHERE (salida_en IS NULL);


--
-- Name: nota_destinatario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX nota_destinatario_idx ON public.nota USING btree (destinatario_usuario_id, creado_en DESC);


--
-- Name: notificacion_no_leidas_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacion_no_leidas_idx ON public.notificacion USING btree (usuario_id) WHERE (leida_en IS NULL);


--
-- Name: notificacion_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacion_usuario_idx ON public.notificacion USING btree (usuario_id, creada_en DESC);


--
-- Name: opcion_votacion_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX opcion_votacion_idx ON public.opcion USING btree (votacion_id);


--
-- Name: outbox_pendiente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_pendiente_idx ON public.outbox USING btree (id) WHERE (procesado_en IS NULL);


--
-- Name: participacion_espera_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participacion_espera_idx ON public.participacion USING btree (partido_id, confirmado_en) WHERE (estado = 'en_espera'::public.estado_participacion);


--
-- Name: participacion_jugador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participacion_jugador_idx ON public.participacion USING btree (jugador_id);


--
-- Name: participacion_oferta_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX participacion_oferta_idx ON public.participacion USING btree (oferta_vence_en) WHERE ((oferta_respuesta IS NULL) AND (oferta_vence_en IS NOT NULL));


--
-- Name: partido_cancha_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partido_cancha_idx ON public.partido USING btree (cancha_id) WHERE (cancha_id IS NOT NULL);


--
-- Name: partido_grupo_inicio_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partido_grupo_inicio_idx ON public.partido USING btree (grupo_id, inicio DESC);


--
-- Name: partido_proximos_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX partido_proximos_idx ON public.partido USING btree (inicio) WHERE ((cancelado_en IS NULL) AND (resultado_cargado_en IS NULL));


--
-- Name: reclamo_pendiente_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX reclamo_pendiente_uq ON public.reclamo_complejo USING btree (cancha_id, usuario_id) WHERE (estado = 'pendiente'::public.estado_solicitud);


--
-- Name: reporte_pendiente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reporte_pendiente_idx ON public.reporte_cancha USING btree (creado_en) WHERE (resuelto_en IS NULL);


--
-- Name: solicitud_historial_pendiente_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX solicitud_historial_pendiente_uq ON public.solicitud_historial USING btree (invitado_jugador_id) WHERE (estado = 'pendiente'::public.estado_solicitud);


--
-- Name: votacion_grupo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX votacion_grupo_idx ON public.votacion USING btree (grupo_id, creado_en DESC);


--
-- Name: votacion_por_cerrar_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX votacion_por_cerrar_idx ON public.votacion USING btree (cierra_en) WHERE ((opcion_ganadora_id IS NULL) AND (cierra_en IS NOT NULL));


--
-- Name: voto_jugador_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX voto_jugador_idx ON public.voto USING btree (jugador_id);


--
-- Name: auditoria auditoria_inmutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auditoria_inmutable BEFORE UPDATE ON public.auditoria FOR EACH ROW EXECUTE FUNCTION public.tg_auditoria_inmutable();


--
-- Name: aval aval_valido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER aval_valido BEFORE INSERT OR UPDATE ON public.aval FOR EACH ROW EXECUTE FUNCTION public.tg_aval_valido();


--
-- Name: calificacion calificacion_valida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calificacion_valida BEFORE INSERT OR UPDATE ON public.calificacion FOR EACH ROW EXECUTE FUNCTION public.tg_calificacion_valida();


--
-- Name: denuncia denuncia_ocultar; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER denuncia_ocultar AFTER INSERT ON public.denuncia FOR EACH ROW EXECUTE FUNCTION public.tg_denuncia_ocultar();


--
-- Name: miembro miembro_admin_requiere_cuenta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER miembro_admin_requiere_cuenta BEFORE INSERT OR UPDATE OF rol ON public.miembro FOR EACH ROW EXECUTE FUNCTION public.tg_admin_requiere_cuenta();


--
-- Name: miembro miembro_invitado_en_su_grupo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER miembro_invitado_en_su_grupo BEFORE INSERT ON public.miembro FOR EACH ROW EXECUTE FUNCTION public.tg_invitado_en_su_grupo();


--
-- Name: nota nota_valida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER nota_valida BEFORE INSERT ON public.nota FOR EACH ROW EXECUTE FUNCTION public.tg_nota_valida();


--
-- Name: participacion participacion_cupo; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER participacion_cupo BEFORE INSERT OR UPDATE OF estado ON public.participacion FOR EACH ROW EXECUTE FUNCTION public.tg_participacion_cupo();


--
-- Name: resena resena_valida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER resena_valida BEFORE INSERT ON public.resena FOR EACH ROW EXECUTE FUNCTION public.tg_resena_valida();


--
-- Name: voto_figura voto_figura_valido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER voto_figura_valido BEFORE INSERT OR UPDATE ON public.voto_figura FOR EACH ROW EXECUTE FUNCTION public.tg_voto_figura_valido();


--
-- Name: voto voto_valido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER voto_valido BEFORE INSERT OR DELETE OR UPDATE ON public.voto FOR EACH ROW EXECUTE FUNCTION public.tg_voto_valido();


--
-- Name: auditoria auditoria_actor_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_actor_usuario_id_fkey FOREIGN KEY (actor_usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: auditoria auditoria_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auditoria
    ADD CONSTRAINT auditoria_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: aval aval_partido_id_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aval
    ADD CONSTRAINT aval_partido_id_jugador_id_fkey FOREIGN KEY (partido_id, jugador_id) REFERENCES public.participacion(partido_id, jugador_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: baja baja_partido_id_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.baja
    ADD CONSTRAINT baja_partido_id_jugador_id_fkey FOREIGN KEY (partido_id, jugador_id) REFERENCES public.participacion(partido_id, jugador_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: calificacion calificacion_calificado_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_calificado_usuario_id_fkey FOREIGN KEY (calificado_usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: calificacion calificacion_calificador_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calificacion
    ADD CONSTRAINT calificacion_calificador_usuario_id_fkey FOREIGN KEY (calificador_usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: cancha cancha_complejo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_complejo_id_fkey FOREIGN KEY (complejo_id) REFERENCES public.complejo(id) ON DELETE SET NULL;


--
-- Name: cancha_foto cancha_foto_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha_foto
    ADD CONSTRAINT cancha_foto_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id) ON DELETE CASCADE;


--
-- Name: cancha_foto cancha_foto_subida_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha_foto
    ADD CONSTRAINT cancha_foto_subida_por_fkey FOREIGN KEY (subida_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: cancha cancha_propuesta_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_propuesta_por_fkey FOREIGN KEY (propuesta_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: cancha cancha_revisada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cancha
    ADD CONSTRAINT cancha_revisada_por_fkey FOREIGN KEY (revisada_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: complejo complejo_encargado_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.complejo
    ADD CONSTRAINT complejo_encargado_usuario_id_fkey FOREIGN KEY (encargado_usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: contacto_cancha contacto_cancha_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacto_cancha
    ADD CONSTRAINT contacto_cancha_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id) ON DELETE CASCADE;


--
-- Name: contacto_cancha contacto_cancha_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacto_cancha
    ADD CONSTRAINT contacto_cancha_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: denuncia denuncia_denunciante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncia
    ADD CONSTRAINT denuncia_denunciante_id_fkey FOREIGN KEY (denunciante_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: denuncia denuncia_resuelta_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.denuncia
    ADD CONSTRAINT denuncia_resuelta_por_fkey FOREIGN KEY (resuelta_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: dispositivo dispositivo_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dispositivo
    ADD CONSTRAINT dispositivo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: votacion ganadora_de_esta_votacion; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votacion
    ADD CONSTRAINT ganadora_de_esta_votacion FOREIGN KEY (opcion_ganadora_id, id) REFERENCES public.opcion(id, votacion_id) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: grupo grupo_creador_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo
    ADD CONSTRAINT grupo_creador_usuario_id_fkey FOREIGN KEY (creador_usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: invitado_token invitado_token_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitado_token
    ADD CONSTRAINT invitado_token_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugador(id) ON DELETE CASCADE;


--
-- Name: jugador jugador_fusionado_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jugador
    ADD CONSTRAINT jugador_fusionado_a_fkey FOREIGN KEY (fusionado_a) REFERENCES public.jugador(id);


--
-- Name: jugador jugador_grupo_invitado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jugador
    ADD CONSTRAINT jugador_grupo_invitado_id_fkey FOREIGN KEY (grupo_invitado_id) REFERENCES public.grupo(id);


--
-- Name: jugador jugador_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.jugador
    ADD CONSTRAINT jugador_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE RESTRICT;


--
-- Name: miembro miembro_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.miembro
    ADD CONSTRAINT miembro_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: miembro miembro_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.miembro
    ADD CONSTRAINT miembro_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugador(id);


--
-- Name: nota nota_autor_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota
    ADD CONSTRAINT nota_autor_usuario_id_fkey FOREIGN KEY (autor_usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: nota nota_destinatario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nota
    ADD CONSTRAINT nota_destinatario_usuario_id_fkey FOREIGN KEY (destinatario_usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: notificacion_desactivada notificacion_desactivada_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion_desactivada
    ADD CONSTRAINT notificacion_desactivada_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: notificacion notificacion_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: notificacion notificacion_partido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES public.partido(id) ON DELETE CASCADE;


--
-- Name: notificacion notificacion_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacion
    ADD CONSTRAINT notificacion_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: opcion opcion_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opcion
    ADD CONSTRAINT opcion_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id);


--
-- Name: opcion opcion_votacion_id_tipo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opcion
    ADD CONSTRAINT opcion_votacion_id_tipo_fkey FOREIGN KEY (votacion_id, tipo) REFERENCES public.votacion(id, tipo) ON DELETE CASCADE;


--
-- Name: participacion participacion_equipo_id_partido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacion
    ADD CONSTRAINT participacion_equipo_id_partido_id_fkey FOREIGN KEY (equipo_id, partido_id) REFERENCES public.partido_equipo(id, partido_id);


--
-- Name: participacion participacion_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacion
    ADD CONSTRAINT participacion_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugador(id);


--
-- Name: participacion participacion_pago_marcado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacion
    ADD CONSTRAINT participacion_pago_marcado_por_fkey FOREIGN KEY (pago_marcado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: participacion participacion_partido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participacion
    ADD CONSTRAINT participacion_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES public.partido(id) ON DELETE CASCADE;


--
-- Name: partido partido_cancelado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_cancelado_por_fkey FOREIGN KEY (cancelado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: partido partido_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id);


--
-- Name: partido partido_creado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: partido_equipo partido_equipo_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido_equipo
    ADD CONSTRAINT partido_equipo_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: partido_equipo partido_equipo_partido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido_equipo
    ADD CONSTRAINT partido_equipo_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES public.partido(id) ON DELETE CASCADE;


--
-- Name: partido partido_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: partido partido_serie_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_serie_id_fkey FOREIGN KEY (serie_id) REFERENCES public.serie(id);


--
-- Name: partido partido_votacion_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_votacion_cancha_id_fkey FOREIGN KEY (votacion_cancha_id) REFERENCES public.votacion(id);


--
-- Name: partido partido_votacion_horario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partido
    ADD CONSTRAINT partido_votacion_horario_id_fkey FOREIGN KEY (votacion_horario_id) REFERENCES public.votacion(id);


--
-- Name: reclamo_complejo reclamo_complejo_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reclamo_complejo
    ADD CONSTRAINT reclamo_complejo_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id) ON DELETE CASCADE;


--
-- Name: reclamo_complejo reclamo_complejo_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reclamo_complejo
    ADD CONSTRAINT reclamo_complejo_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: reclamo_complejo reclamo_complejo_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reclamo_complejo
    ADD CONSTRAINT reclamo_complejo_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: reporte_cancha reporte_cancha_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_cancha
    ADD CONSTRAINT reporte_cancha_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id) ON DELETE CASCADE;


--
-- Name: reporte_cancha reporte_cancha_resuelto_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_cancha
    ADD CONSTRAINT reporte_cancha_resuelto_por_fkey FOREIGN KEY (resuelto_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: reporte_cancha reporte_cancha_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reporte_cancha
    ADD CONSTRAINT reporte_cancha_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: resena resena_autor_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_autor_usuario_id_fkey FOREIGN KEY (autor_usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: resena resena_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resena
    ADD CONSTRAINT resena_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id) ON DELETE CASCADE;


--
-- Name: serie serie_cancha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serie
    ADD CONSTRAINT serie_cancha_id_fkey FOREIGN KEY (cancha_id) REFERENCES public.cancha(id);


--
-- Name: serie serie_creada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serie
    ADD CONSTRAINT serie_creada_por_fkey FOREIGN KEY (creada_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: serie serie_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serie
    ADD CONSTRAINT serie_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: serie serie_reemplaza_a_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.serie
    ADD CONSTRAINT serie_reemplaza_a_fkey FOREIGN KEY (reemplaza_a) REFERENCES public.serie(id);


--
-- Name: solicitud_historial solicitud_historial_invitado_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_historial
    ADD CONSTRAINT solicitud_historial_invitado_jugador_id_fkey FOREIGN KEY (invitado_jugador_id) REFERENCES public.jugador(id) ON DELETE CASCADE;


--
-- Name: solicitud_historial solicitud_historial_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_historial
    ADD CONSTRAINT solicitud_historial_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: solicitud_historial solicitud_historial_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitud_historial
    ADD CONSTRAINT solicitud_historial_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuario(id) ON DELETE CASCADE;


--
-- Name: votacion votacion_creada_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votacion
    ADD CONSTRAINT votacion_creada_por_fkey FOREIGN KEY (creada_por) REFERENCES public.usuario(id) ON DELETE SET NULL;


--
-- Name: votacion votacion_grupo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.votacion
    ADD CONSTRAINT votacion_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES public.grupo(id);


--
-- Name: voto_figura voto_figura_partido_id_votado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voto_figura
    ADD CONSTRAINT voto_figura_partido_id_votado_id_fkey FOREIGN KEY (partido_id, votado_id) REFERENCES public.participacion(partido_id, jugador_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: voto_figura voto_figura_partido_id_votante_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voto_figura
    ADD CONSTRAINT voto_figura_partido_id_votante_id_fkey FOREIGN KEY (partido_id, votante_id) REFERENCES public.participacion(partido_id, jugador_id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: voto voto_jugador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voto
    ADD CONSTRAINT voto_jugador_id_fkey FOREIGN KEY (jugador_id) REFERENCES public.jugador(id);


--
-- Name: voto voto_opcion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voto
    ADD CONSTRAINT voto_opcion_id_fkey FOREIGN KEY (opcion_id) REFERENCES public.opcion(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260928120001'),
    ('20260928120002'),
    ('20260928120003'),
    ('20260928120004'),
    ('20260928120005'),
    ('20260928120006'),
    ('20260928120007'),
    ('20260928120008');
