// /v1/grupos y /v1/invitaciones de punta a punta: Fastify + Better Auth + Postgres real
// (ADR 0014). Las cuentas se crean y verifican por la API, como lo haría un cliente.
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { construirApi } from '../../src/composition/api.ts';
import { crearCuentas } from '../../src/composition/cuentas.ts';
import { crearDependencias, type Dependencias } from '../../src/composition/dependencias.ts';
import { autenticarConCuentas, crearGrupos } from '../../src/composition/grupos.ts';
import type { EnviadorDeMails } from '../../src/modules/cuentas/application/puertos.ts';
import { relojDelSistema } from '../../src/shared/clock.ts';
import type { ConfigDeApi } from '../../src/shared/config.ts';
import { loggerEnMemoria } from '../apoyo.ts';
import { levantarPostgres, type PostgresDePrueba } from '../postgres.ts';

const enlaces = new Map<string, string>();
const mails: EnviadorDeMails = {
  enviarVerificacion: (destino, enlace) => {
    enlaces.set(destino, enlace);
    return Promise.resolve();
  },
  enviarRecuperacion: () => Promise.resolve(),
};

const urlDeLaWeb = 'https://canchitas.test';
const log = loggerEnMemoria();

let postgres: PostgresDePrueba;
let deps: Dependencias;
let app: FastifyInstance;

beforeAll(async () => {
  postgres = await levantarPostgres();
  const config: ConfigDeApi = {
    DATABASE_URL: postgres.url,
    PORT: 0,
    HOST: '127.0.0.1',
    LOG_LEVEL: 'info',
    APP_VERSION: 'test',
    AUTH_SECRETO: 'secreto-de-los-tests-de-integracion-de-grupos',
    URL_API: urlDeLaWeb,
    URL_WEB: urlDeLaWeb,
    SMTP_HOST: 'no-se-usa',
    SMTP_PUERTO: 25,
    SMTP_SEGURO: false,
    SMTP_USUARIO: undefined,
    SMTP_CONTRASENA: undefined,
    MAIL_REMITENTE: 'Canchitas <no-responder@canchitas.test>',
    ARGON2_MEMORIA_KIB: 8_192,
    ARGON2_PASADAS: 1,
  };
  deps = crearDependencias(config, 'api');
  const cuentas = crearCuentas({
    config,
    db: deps.db,
    logger: log.logger,
    clock: relojDelSistema,
    mails,
  });
  app = await construirApi({
    logger: log.logger,
    consultarSalud: deps.consultarSalud,
    clock: relojDelSistema,
    cuentas,
    grupos: crearGrupos({ db: deps.db, clock: relojDelSistema }),
    autenticar: autenticarConCuentas(cuentas),
    urlDeLaWeb,
  });
});

afterAll(async () => {
  await app.close();
  await deps.cerrar();
  await postgres.detener();
});

type Credencial = { cookie: string } | { authorization: string };

let numero = 0;
const ultimoNombreDeUsuario = () => `jugador_${String(numero)}`;

/** Cuenta nueva con sesión. Web: cookie; Android: bearer (ADR 0009). */
async function persona(
  opciones: { verificada?: boolean; cliente?: 'web' | 'android' } = {},
): Promise<Credencial> {
  numero += 1;
  const email = `jugador${String(numero)}@mail.com`;
  const contrasena = 'una-contrasena-segura';
  const alta = await app.inject({
    method: 'POST',
    url: '/v1/cuentas',
    payload: {
      email,
      contrasena,
      nombreUsuario: ultimoNombreDeUsuario(),
      fechaNacimiento: '1995-05-20',
      aceptaPrivacidad: true,
    },
  });
  expect(alta.statusCode).toBe(201);
  if (opciones.verificada ?? true) {
    await verificar(email);
  }
  if (opciones.cliente === 'android') {
    const sesion = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/sesion/token',
      payload: { email, contrasena },
    });
    return { authorization: `Bearer ${sesion.json<{ token: string }>().token}` };
  }
  const sesion = await app.inject({
    method: 'POST',
    url: '/v1/cuentas/sesion',
    payload: { email, contrasena },
  });
  const cookie = sesion.cookies.find((c) => c.name === '__Secure-canchitas.session_token');
  if (cookie === undefined) {
    throw new Error('No hay cookie de sesión');
  }
  return { cookie: `${cookie.name}=${cookie.value}` };
}

async function verificar(email: string): Promise<void> {
  for (let i = 0; i < 100 && !enlaces.has(email); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  const enlace = enlaces.get(email);
  if (enlace === undefined) {
    throw new Error('No llegó el mail de verificación');
  }
  const token = decodeURIComponent(new URL(enlace).hash.replace(/^#token=/, ''));
  const respuesta = await app.inject({
    method: 'POST',
    url: '/v1/cuentas/verificacion',
    payload: { token },
  });
  expect(respuesta.statusCode).toBe(204);
}

const pedir = (
  credencial: Credencial | null,
  method: 'GET' | 'POST',
  url: string,
  payload?: Record<string, unknown>,
) => app.inject({ method, url, headers: credencial ?? {}, ...(payload ? { payload } : {}) });

const tipo = (respuesta: LightMyRequestResponse): unknown =>
  respuesta.json<{ type: string }>().type;

interface GrupoDeLaApi {
  id: string;
  nombre: string;
  cantidadMiembros: number;
  rol: string;
  link: string | null;
  acciones: string[];
}

async function crearGrupo(credencial: Credencial, nombre = 'Los del jueves') {
  const respuesta = await pedir(credencial, 'POST', '/v1/grupos', { nombre });
  expect(respuesta.statusCode).toBe(201);
  const grupo = respuesta.json<GrupoDeLaApi>();
  const token = new URL(grupo.link ?? '').pathname.replace(/^\/i\//, '');
  return { grupo, token };
}

describe('RF-010 — crear un grupo', () => {
  it('desde Android: el grupo existe, quien lo crea es admin y se genera el link', async () => {
    const ana = await persona({ cliente: 'android' });

    const respuesta = await pedir(ana, 'POST', '/v1/grupos', { nombre: ' Los del jueves ' });

    expect(respuesta.statusCode).toBe(201);
    const grupo = respuesta.json<GrupoDeLaApi>();
    expect(respuesta.headers.location).toBe(`/v1/grupos/${grupo.id}`);
    expect(grupo).toMatchObject({ nombre: 'Los del jueves', cantidadMiembros: 1, rol: 'admin' });
    expect(grupo.link).toMatch(/^https:\/\/canchitas\.test\/i\/[A-Za-z0-9_-]{22}$/);
    expect(grupo.acciones).toContain('regenerar_link');

    const mios = await pedir(ana, 'GET', '/v1/grupos');
    expect(mios.json()).toEqual({
      grupos: [{ id: grupo.id, nombre: 'Los del jueves', cantidadMiembros: 1, rol: 'admin' }],
    });
  });

  it('sin sesión responde 401', async () => {
    const respuesta = await pedir(null, 'POST', '/v1/grupos', { nombre: 'Los del jueves' });
    expect(respuesta.statusCode).toBe(401);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/sin-sesion');
  });

  it('RF-004: una cuenta sin verificar no crea grupos', async () => {
    const caro = await persona({ verificada: false });
    const respuesta = await pedir(caro, 'POST', '/v1/grupos', { nombre: 'Los del jueves' });
    expect(respuesta.statusCode).toBe(403);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/cuenta-sin-verificar');
  });

  it('rechaza un nombre vacío con 422', async () => {
    const ana = await persona();
    const respuesta = await pedir(ana, 'POST', '/v1/grupos', { nombre: '   ' });
    expect(respuesta.statusCode).toBe(422);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/nombre-de-grupo-invalido');
  });
});

describe('RF-011 — unirse a un grupo por link', () => {
  it('otra persona abre el link desde la web, lo acepta y pasa a ser miembro', async () => {
    const { grupo, token } = await crearGrupo(await persona({ cliente: 'android' }));
    const beto = await persona();

    const vista = await pedir(beto, 'GET', `/v1/invitaciones/${token}`);
    expect(vista.statusCode).toBe(200);
    expect(vista.json()).toEqual({
      grupoId: grupo.id,
      nombre: 'Los del jueves',
      cantidadMiembros: 1,
      estado: 'puede_unirse',
    });

    const union = await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);
    expect(union.statusCode).toBe(200);
    expect(union.json()).toEqual({ grupoId: grupo.id, yaEraMiembro: false });

    const visto = await pedir(beto, 'GET', `/v1/grupos/${grupo.id}`);
    expect(visto.json()).toMatchObject({ rol: 'jugador', cantidadMiembros: 2 });
  });

  it('el que ya es miembro va al grupo sin duplicar la membresía', async () => {
    const ana = await persona();
    const { grupo, token } = await crearGrupo(ana);
    const beto = await persona();
    await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);

    const otraVez = await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);
    const delCreador = await pedir(ana, 'POST', `/v1/invitaciones/${token}/aceptacion`);

    expect(otraVez.json()).toEqual({ grupoId: grupo.id, yaEraMiembro: true });
    expect(delCreador.json()).toEqual({ grupoId: grupo.id, yaEraMiembro: true });
    const visto = await pedir(ana, 'GET', `/v1/grupos/${grupo.id}`);
    expect(visto.json()).toMatchObject({ rol: 'admin', cantidadMiembros: 2 });
  });

  it('RF-004: una cuenta sin verificar no se une; la invitación se lo dice', async () => {
    const { token } = await crearGrupo(await persona());
    const caro = await persona({ verificada: false });

    const vista = await pedir(caro, 'GET', `/v1/invitaciones/${token}`);
    const union = await pedir(caro, 'POST', `/v1/invitaciones/${token}/aceptacion`);

    expect(vista.json()).toMatchObject({ estado: 'cuenta_sin_verificar' });
    expect(union.statusCode).toBe(403);
    expect(tipo(union)).toBe('https://canchitas.app/errores/cuenta-sin-verificar');
  });

  it('RN-27: sin sesión no se ve nada del grupo', async () => {
    const { token } = await crearGrupo(await persona());

    const vista = await pedir(null, 'GET', `/v1/invitaciones/${token}`);

    expect(vista.statusCode).toBe(401);
    expect(vista.body).not.toContain('Los del jueves');
  });

  it('un link que no existe informa que no es válido', async () => {
    const beto = await persona();
    const vista = await pedir(beto, 'GET', '/v1/invitaciones/no-existe');
    const union = await pedir(beto, 'POST', '/v1/invitaciones/no-existe/aceptacion');
    expect(vista.statusCode).toBe(404);
    expect(tipo(vista)).toBe('https://canchitas.app/errores/link-invalido');
    expect(tipo(union)).toBe('https://canchitas.app/errores/link-invalido');
  });

  it('RN-28: el que salió vuelve como jugador; el expulsado no vuelve', async () => {
    const { grupo, token } = await crearGrupo(await persona());
    const beto = await persona();
    const nombreDeBeto = ultimoNombreDeUsuario();
    const dani = await persona();
    const nombreDeDani = ultimoNombreDeUsuario();
    await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);
    await pedir(dani, 'POST', `/v1/invitaciones/${token}/aceptacion`);
    // Salir y expulsar llegan en M2 (RF-016, RF-017): acá se marca la salida en la base.
    await marcarSalida(grupo.id, nombreDeBeto, 'salio');
    await marcarSalida(grupo.id, nombreDeDani, 'expulsado');

    const vuelta = await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);
    const vistaDani = await pedir(dani, 'GET', `/v1/invitaciones/${token}`);
    const rechazo = await pedir(dani, 'POST', `/v1/invitaciones/${token}/aceptacion`);

    expect(vuelta.json()).toEqual({ grupoId: grupo.id, yaEraMiembro: false });
    expect((await pedir(beto, 'GET', `/v1/grupos/${grupo.id}`)).json()).toMatchObject({
      rol: 'jugador',
    });
    expect(vistaDani.json()).toMatchObject({ estado: 'expulsado' });
    expect(rechazo.statusCode).toBe(403);
    expect(tipo(rechazo)).toBe('https://canchitas.app/errores/expulsado-del-grupo');
    expect((await pedir(dani, 'GET', `/v1/grupos/${grupo.id}`)).statusCode).toBe(404);
  });

  it('ADR 0015: el token del link no queda en los logs', async () => {
    const { token } = await crearGrupo(await persona());
    await pedir(await persona(), 'GET', `/v1/invitaciones/${token}`);
    expect(log.lineas.join('')).not.toContain(token);
  });
});

async function marcarSalida(
  grupoId: string,
  nombreUsuario: string,
  motivo: 'salio' | 'expulsado',
): Promise<void> {
  await deps.db
    .updateTable('miembro')
    .set({ salida_en: new Date(), motivo_salida: motivo })
    .where('grupo_id', '=', grupoId)
    .where('jugador_id', '=', (eb) =>
      eb
        .selectFrom('jugador')
        .innerJoin('usuario', 'usuario.id', 'jugador.usuario_id')
        .select('jugador.id')
        .where('usuario.nombre_usuario', '=', nombreUsuario),
    )
    .execute();
}

describe('RF-012 — regenerar el link de invitación', () => {
  it('el admin lo regenera: el anterior deja de funcionar y el nuevo sirve', async () => {
    const ana = await persona();
    const { grupo, token } = await crearGrupo(ana);

    const respuesta = await pedir(ana, 'POST', `/v1/grupos/${grupo.id}/link/regeneracion`);

    expect(respuesta.statusCode).toBe(200);
    const nuevo = respuesta.json<GrupoDeLaApi>();
    expect(nuevo.link).not.toBe(grupo.link);
    const beto = await persona();
    const viejo = await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);
    expect(viejo.statusCode).toBe(404);
    expect(tipo(viejo)).toBe('https://canchitas.app/errores/link-invalido');
    const tokenNuevo = new URL(nuevo.link ?? '').pathname.replace(/^\/i\//, '');
    expect(
      (await pedir(beto, 'POST', `/v1/invitaciones/${tokenNuevo}/aceptacion`)).statusCode,
    ).toBe(200);
  });

  it('un jugador que no es admin recibe un rechazo y no ve el link (RN-26)', async () => {
    const { grupo, token } = await crearGrupo(await persona());
    const beto = await persona();
    await pedir(beto, 'POST', `/v1/invitaciones/${token}/aceptacion`);

    const visto = await pedir(beto, 'GET', `/v1/grupos/${grupo.id}`);
    const rechazo = await pedir(beto, 'POST', `/v1/grupos/${grupo.id}/link/regeneracion`);

    expect(visto.json()).toMatchObject({ link: null, acciones: [] });
    expect(visto.body).not.toContain(token);
    expect(rechazo.statusCode).toBe(403);
    expect(tipo(rechazo)).toBe('https://canchitas.app/errores/requiere-admin');
  });

  it('RNF-013: alguien de afuera recibe 404, igual que un grupo que no existe', async () => {
    const { grupo } = await crearGrupo(await persona());
    const beto = await persona();

    for (const id of [grupo.id, '00000000-0000-4000-8000-000000000000']) {
      const visto = await pedir(beto, 'GET', `/v1/grupos/${id}`);
      const regenerado = await pedir(beto, 'POST', `/v1/grupos/${id}/link/regeneracion`);
      expect(visto.statusCode).toBe(404);
      expect(regenerado.statusCode).toBe(404);
      expect(tipo(regenerado)).toBe('https://canchitas.app/errores/grupo-no-encontrado');
    }
  });
});
