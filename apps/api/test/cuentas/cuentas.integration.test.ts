// /v1/cuentas de punta a punta: Fastify + Better Auth + Postgres real (ADR 0009, ADR 0014).
// Los mails quedan en un buzón en memoria; el reloj del bloqueo (RNF-011) se puede adelantar.
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { construirApi } from '../../src/composition/api.ts';
import { crearCuentas } from '../../src/composition/cuentas.ts';
import { crearDependencias, type Dependencias } from '../../src/composition/dependencias.ts';
import type { EnviadorDeMails } from '../../src/modules/cuentas/application/puertos.ts';
import type { ConfigDeApi } from '../../src/shared/config.ts';
import { loggerEnMemoria } from '../apoyo.ts';
import { levantarPostgres, type PostgresDePrueba } from '../postgres.ts';

interface Mail {
  tipo: 'verificacion' | 'recuperacion';
  destino: string;
  enlace: string;
}

const buzon: Mail[] = [];
const mails: EnviadorDeMails = {
  enviarVerificacion: (destino, enlace) => {
    buzon.push({ tipo: 'verificacion', destino, enlace });
    return Promise.resolve();
  },
  enviarRecuperacion: (destino, enlace) => {
    buzon.push({ tipo: 'recuperacion', destino, enlace });
    return Promise.resolve();
  },
};

const reloj = { desfaseMs: 0 };
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
    AUTH_SECRETO: 'secreto-de-los-tests-de-integracion-de-cuentas',
    URL_API: 'https://canchitas.test',
    URL_WEB: 'https://canchitas.test',
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
  const clock = { ahora: () => new Date(Date.now() + reloj.desfaseMs) };
  app = await construirApi({
    logger: log.logger,
    consultarSalud: deps.consultarSalud,
    clock,
    cuentas: crearCuentas({ config, db: deps.db, logger: log.logger, clock, mails }),
  });
});

afterAll(async () => {
  await app.close();
  await deps.cerrar();
  await postgres.detener();
});

beforeEach(() => {
  reloj.desfaseMs = 0;
});

let numero = 0;
function datosNuevos(cambios: Record<string, unknown> = {}) {
  numero += 1;
  return {
    email: `persona${String(numero)}@mail.com`,
    contrasena: 'una-contrasena-segura',
    nombreUsuario: `persona_${String(numero)}`,
    fechaNacimiento: '1995-05-20',
    aceptaPrivacidad: true,
    ...cambios,
  };
}

const registrar = (body: Record<string, unknown>) =>
  app.inject({ method: 'POST', url: '/v1/cuentas', payload: body });

const iniciar = (email: string, contrasena: string) =>
  app.inject({ method: 'POST', url: '/v1/cuentas/sesion', payload: { email, contrasena } });

const iniciarConToken = (email: string, contrasena: string) =>
  app.inject({ method: 'POST', url: '/v1/cuentas/sesion/token', payload: { email, contrasena } });

async function esperarMail(destino: string, tipo: Mail['tipo']): Promise<string> {
  for (let i = 0; i < 100; i++) {
    const mail = buzon.findLast((m) => m.destino === destino && m.tipo === tipo);
    if (mail !== undefined) {
      const token = new URL(mail.enlace).hash.replace(/^#token=/, '');
      return decodeURIComponent(token);
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`No llegó el mail de ${tipo}`);
}

function cookieDeSesion(respuesta: LightMyRequestResponse): string {
  const cookie = respuesta.cookies.find((c) => c.name === '__Secure-canchitas.session_token');
  if (cookie === undefined) {
    throw new Error('No hay cookie de sesión');
  }
  return `${cookie.name}=${cookie.value}`;
}

const tipo = (respuesta: LightMyRequestResponse): unknown =>
  respuesta.json<{ type: string }>().type;

async function cuentaVerificada(): Promise<ReturnType<typeof datosNuevos>> {
  const datos = datosNuevos();
  expect((await registrar(datos)).statusCode).toBe(201);
  const token = await esperarMail(datos.email, 'verificacion');
  await app.inject({ method: 'POST', url: '/v1/cuentas/verificacion', payload: { token } });
  return datos;
}

describe('RF-001 — registrarse con mail y contraseña', () => {
  it('crea la cuenta "Sin verificar" y manda el mail de verificación', async () => {
    const datos = datosNuevos({ email: 'Nueva@Mail.com', nombreUsuario: 'Nueva_Persona' });

    const respuesta = await registrar(datos);

    expect(respuesta.statusCode).toBe(201);
    expect(respuesta.json()).toEqual({
      email: 'nueva@mail.com',
      nombreUsuario: 'nueva_persona',
      estado: 'sin_verificar',
    });
    const fila = await deps.db
      .selectFrom('usuario')
      .select(['estado', 'email_verificado'])
      .where('email', '=', 'nueva@mail.com')
      .executeTakeFirstOrThrow();
    expect(fila).toEqual({ estado: 'sin_verificar', email_verificado: false });
    expect(await esperarMail('nueva@mail.com', 'verificacion')).not.toBe('');
  });

  it('no inicia sesión al registrarse', async () => {
    const respuesta = await registrar(datosNuevos());
    expect(respuesta.headers['set-cookie']).toBeUndefined();
  });

  it('rechaza un mail ya registrado e informa que está en uso', async () => {
    const datos = datosNuevos();
    await registrar(datos);

    const respuesta = await registrar({
      ...datos,
      email: datos.email.toUpperCase(),
      nombreUsuario: 'otro_nombre',
    });

    expect(respuesta.statusCode).toBe(409);
    expect(respuesta.headers['content-type']).toContain('application/problem+json');
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/email-en-uso');
  });

  it('rechaza una contraseña de menos de 8 caracteres', async () => {
    const respuesta = await registrar(datosNuevos({ contrasena: 'corta' }));
    expect(respuesta.statusCode).toBe(400);
  });
});

describe('RF-002 y RN-20 — validar la edad', () => {
  const hoyEnArgentina = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
      new Date(),
    );

  it('rechaza 17 años e informa la edad requerida', async () => {
    const [anio, mes, dia] = hoyEnArgentina().split('-');
    const respuesta = await registrar(
      datosNuevos({ fechaNacimiento: `${String(Number(anio) - 17)}-${mes ?? ''}-${dia ?? ''}` }),
    );
    expect(respuesta.statusCode).toBe(422);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/menor-de-edad');
    expect(respuesta.json<{ title: string }>().title).toContain('18 años');
  });

  it('acepta 18 años cumplidos hoy', async () => {
    const [anio, mes, dia] = hoyEnArgentina().split('-');
    // El 29 de febrero no existe 18 años antes en la mitad de los casos: se usa el 28.
    const diaValido = mes === '02' && dia === '29' ? '28' : (dia ?? '');
    const respuesta = await registrar(
      datosNuevos({ fechaNacimiento: `${String(Number(anio) - 18)}-${mes ?? ''}-${diaValido}` }),
    );
    expect(respuesta.statusCode).toBe(201);
  });
});

describe('RF-003 — nombre de usuario único', () => {
  it('rechaza un nombre tomado antes de crear la cuenta, sin importar mayúsculas', async () => {
    const primera = datosNuevos();
    await registrar(primera);
    const segunda = datosNuevos({ nombreUsuario: primera.nombreUsuario.toUpperCase() });

    const respuesta = await registrar(segunda);

    expect(respuesta.statusCode).toBe(409);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/nombre-de-usuario-en-uso');
    const creada = await deps.db
      .selectFrom('usuario')
      .select('id')
      .where('email', '=', segunda.email)
      .executeTakeFirst();
    expect(creada).toBeUndefined();
  });

  it('rechaza un formato inválido', async () => {
    const respuesta = await registrar(datosNuevos({ nombreUsuario: 'con espacio' }));
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/nombre-de-usuario-invalido');
  });
});

describe('RNF-018 — aceptación de la política de privacidad', () => {
  it('sin aceptación no crea la cuenta', async () => {
    const respuesta = await registrar(datosNuevos({ aceptaPrivacidad: false }));
    expect(respuesta.statusCode).toBe(422);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/privacidad-no-aceptada');
  });

  it('registra el instante de la aceptación', async () => {
    const datos = datosNuevos();
    const antes = new Date();
    await registrar(datos);
    const fila = await deps.db
      .selectFrom('usuario')
      .select('privacidad_aceptada_en')
      .where('email', '=', datos.email)
      .executeTakeFirstOrThrow();
    expect(new Date(fila.privacidad_aceptada_en).getTime()).toBeGreaterThanOrEqual(
      antes.getTime() - 1000,
    );
  });
});

describe('RNF-009 — contraseñas con hash robusto', () => {
  it('guarda la contraseña como argon2id', async () => {
    const datos = datosNuevos();
    await registrar(datos);
    const fila = await deps.db
      .selectFrom('credencial')
      .innerJoin('usuario', 'usuario.id', 'credencial.usuario_id')
      .select('credencial.contrasena_hash')
      .where('usuario.email', '=', datos.email)
      .executeTakeFirstOrThrow();
    expect(fila.contrasena_hash).toMatch(/^\$argon2id\$v=19\$m=8192,t=1,p=1\$/);
    expect(fila.contrasena_hash).not.toContain(datos.contrasena);
  });
});

describe('RF-004 y RNF-014 — verificar el mail', () => {
  it('el enlace activa la cuenta y no sirve una segunda vez', async () => {
    const datos = datosNuevos();
    await registrar(datos);
    const token = await esperarMail(datos.email, 'verificacion');

    const primera = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/verificacion',
      payload: { token },
    });
    const segunda = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/verificacion',
      payload: { token },
    });

    expect(primera.statusCode).toBe(204);
    const fila = await deps.db
      .selectFrom('usuario')
      .select(['estado', 'email_verificado_en'])
      .where('email', '=', datos.email)
      .executeTakeFirstOrThrow();
    expect(fila.estado).toBe('activa');
    expect(fila.email_verificado_en).not.toBeNull();
    expect(segunda.statusCode).toBe(410);
    expect(tipo(segunda)).toBe('https://canchitas.app/errores/enlace-usado');
  });

  it('un enlace adulterado se rechaza', async () => {
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/verificacion',
      payload: { token: 'no-es-un-token' },
    });
    expect(respuesta.statusCode).toBe(400);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/enlace-invalido');
  });

  it('se puede reenviar el mail, y el reenvío no revela si la cuenta existe', async () => {
    const datos = datosNuevos();
    await registrar(datos);
    const antes = buzon.length;

    const existe = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/verificacion/reenvio',
      payload: { email: datos.email },
    });
    const noExiste = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/verificacion/reenvio',
      payload: { email: 'nadie@mail.com' },
    });

    expect(existe.statusCode).toBe(202);
    expect(noExiste.statusCode).toBe(202);
    await esperarMail(datos.email, 'verificacion');
    expect(buzon.length).toBeGreaterThan(antes);
    expect(buzon.some((m) => m.destino === 'nadie@mail.com')).toBe(false);
  });

  it('la cuenta sin verificar puede iniciar sesión y se ve como sin verificar', async () => {
    const datos = datosNuevos();
    await registrar(datos);
    const inicio = await iniciar(datos.email, datos.contrasena);
    const yo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { cookie: cookieDeSesion(inicio) },
    });
    expect(yo.json()).toMatchObject({ estado: 'sin_verificar' });
  });
});

describe('RF-005 — iniciar sesión', () => {
  it('con mail y contraseña correctos deja una cookie HttpOnly, Secure y SameSite=Lax', async () => {
    const datos = await cuentaVerificada();

    const respuesta = await iniciar(datos.email.toUpperCase(), datos.contrasena);

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ email: datos.email, estado: 'activa' });
    const cookie = respuesta.cookies.find((c) => c.name === '__Secure-canchitas.session_token');
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax', path: '/' });
    expect(respuesta.body).not.toContain(cookie?.value.split('.')[0] ?? 'sin-token');

    const yo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { cookie: cookieDeSesion(respuesta) },
    });
    expect(yo.json()).toMatchObject({ email: datos.email });
  });

  it('no dice si falló el mail o la contraseña', async () => {
    const datos = await cuentaVerificada();

    const malaContrasena = await iniciar(datos.email, 'otra-contrasena');
    const malMail = await iniciar('nadie@mail.com', datos.contrasena);

    expect(malaContrasena.statusCode).toBe(401);
    expect(malMail.statusCode).toBe(401);
    expect(malaContrasena.json()).toEqual(malMail.json());
  });

  it('sin sesión, /yo responde 401', async () => {
    const respuesta = await app.inject({ method: 'GET', url: '/v1/cuentas/yo' });
    expect(respuesta.statusCode).toBe(401);
    expect(tipo(respuesta)).toBe('https://canchitas.app/errores/sin-sesion');
  });
});

describe('RNF-011 — bloqueo tras intentos fallidos', () => {
  it('5 fallos consecutivos bloquean 15 minutos, aun con la contraseña correcta', async () => {
    const datos = await cuentaVerificada();
    const respuestas = [];
    for (let i = 0; i < 5; i++) {
      respuestas.push(await iniciar(datos.email, 'incorrecta'));
    }
    expect(respuestas.slice(0, 4).map((r) => r.statusCode)).toEqual([401, 401, 401, 401]);
    expect(respuestas[4]?.statusCode).toBe(429);
    expect(Number(respuestas[4]?.headers['retry-after'])).toBeGreaterThan(14 * 60);

    const correcta = await iniciar(datos.email, datos.contrasena);
    expect(correcta.statusCode).toBe(429);
    expect(tipo(correcta)).toBe('https://canchitas.app/errores/cuenta-bloqueada');

    reloj.desfaseMs = 15 * 60 * 1000;
    expect((await iniciar(datos.email, datos.contrasena)).statusCode).toBe(200);
  });

  it('un inicio correcto reinicia el conteo', async () => {
    const datos = await cuentaVerificada();
    for (let i = 0; i < 4; i++) {
      await iniciar(datos.email, 'incorrecta');
    }
    expect((await iniciar(datos.email, datos.contrasena)).statusCode).toBe(200);
    for (let i = 0; i < 4; i++) {
      expect((await iniciar(datos.email, 'incorrecta')).statusCode).toBe(401);
    }
  });

  it('los intentos simultáneos cuentan todos', async () => {
    const datos = await cuentaVerificada();
    await Promise.all(Array.from({ length: 5 }, () => iniciar(datos.email, 'incorrecta')));
    expect((await iniciar(datos.email, datos.contrasena)).statusCode).toBe(429);
  });

  it('no guarda el mail en la tabla de intentos', async () => {
    const filas = await deps.db.selectFrom('intento_inicio').selectAll().execute();
    expect(JSON.stringify(filas)).not.toContain('@');
  });
});

describe('RNF-012 — sesión de Android por 30 días desde el último uso', () => {
  it('devuelve un bearer que sirve para las siguientes solicitudes, sin cookie', async () => {
    const datos = await cuentaVerificada();

    const respuesta = await iniciarConToken(datos.email, datos.contrasena);

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.headers['set-cookie']).toBeUndefined();
    const { token } = respuesta.json<{ token: string }>();
    const yo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(yo.json()).toMatchObject({ email: datos.email });

    const sesion = await deps.db
      .selectFrom('sesion')
      .select('expira_en')
      .where('token', '=', token)
      .executeTakeFirstOrThrow();
    const dias = (new Date(sesion.expira_en).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(dias).toBeGreaterThan(29.9);
    expect(dias).toBeLessThanOrEqual(30);
  });

  it('usar la sesión corre el vencimiento', async () => {
    const datos = await cuentaVerificada();
    const { token } = (await iniciarConToken(datos.email, datos.contrasena)).json<{
      token: string;
    }>();
    // Como si el último uso hubiera sido hace 10 días (Better Auth mira expira_en).
    await deps.db
      .updateTable('sesion')
      .set({
        expira_en: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        actualizado_en: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      })
      .where('token', '=', token)
      .execute();

    await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { authorization: `Bearer ${token}` },
    });

    const sesion = await deps.db
      .selectFrom('sesion')
      .select('expira_en')
      .where('token', '=', token)
      .executeTakeFirstOrThrow();
    const dias = (new Date(sesion.expira_en).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(dias).toBeGreaterThan(29.9);
  });

  it('en la web, usar la sesión renueva la cookie por 30 días más', async () => {
    const datos = await cuentaVerificada();
    const cookie = cookieDeSesion(await iniciar(datos.email, datos.contrasena));
    await deps.db
      .updateTable('sesion')
      .set({ expira_en: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000) })
      .where('token', '=', decodeURIComponent(cookie.split('=')[1] ?? '').split('.')[0] ?? '')
      .execute();

    const yo = await app.inject({ method: 'GET', url: '/v1/cuentas/yo', headers: { cookie } });

    const renovada = yo.cookies.find((c) => c.name === '__Secure-canchitas.session_token');
    expect(renovada?.maxAge).toBe(30 * 24 * 60 * 60);
  });

  it('una sesión vencida ya no sirve', async () => {
    const datos = await cuentaVerificada();
    const { token } = (await iniciarConToken(datos.email, datos.contrasena)).json<{
      token: string;
    }>();
    await deps.db
      .updateTable('sesion')
      .set({ expira_en: new Date(Date.now() - 1000) })
      .where('token', '=', token)
      .execute();
    const yo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(yo.statusCode).toBe(401);
  });
});

describe('RF-006 y RNF-014 — recuperar la contraseña', () => {
  it('manda el enlace, cambia la contraseña, cierra las sesiones y el enlace no sirve dos veces', async () => {
    const datos = await cuentaVerificada();
    const sesionVieja = (await iniciarConToken(datos.email, datos.contrasena)).json<{
      token: string;
    }>();

    const pedido = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/recuperacion',
      payload: { email: datos.email },
    });
    expect(pedido.statusCode).toBe(202);
    const token = await esperarMail(datos.email, 'recuperacion');

    const confirmar = (contrasenaNueva: string) =>
      app.inject({
        method: 'POST',
        url: '/v1/cuentas/recuperacion/confirmacion',
        payload: { token, contrasenaNueva },
      });

    expect((await confirmar('contrasena-nueva-1')).statusCode).toBe(204);
    const reuso = await confirmar('contrasena-nueva-2');
    expect(reuso.statusCode).toBe(400);
    expect(tipo(reuso)).toBe('https://canchitas.app/errores/enlace-invalido');

    expect((await iniciar(datos.email, datos.contrasena)).statusCode).toBe(401);
    expect((await iniciar(datos.email, 'contrasena-nueva-1')).statusCode).toBe(200);
    const yoViejo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { authorization: `Bearer ${sesionVieja.token}` },
    });
    expect(yoViejo.statusCode).toBe(401);
  });

  it('responde igual para un mail sin cuenta y no manda nada', async () => {
    const respuesta = await app.inject({
      method: 'POST',
      url: '/v1/cuentas/recuperacion',
      payload: { email: 'sin-cuenta@mail.com' },
    });
    expect(respuesta.statusCode).toBe(202);
    expect(buzon.some((m) => m.destino === 'sin-cuenta@mail.com')).toBe(false);
  });
});

describe('RF-007 — cerrar sesión', () => {
  it('en la web vence la cookie y la sesión deja de servir', async () => {
    const datos = await cuentaVerificada();
    const cookie = cookieDeSesion(await iniciar(datos.email, datos.contrasena));

    const cierre = await app.inject({
      method: 'DELETE',
      url: '/v1/cuentas/sesion',
      headers: { cookie },
    });

    expect(cierre.statusCode).toBe(204);
    const vencida = cierre.cookies.find((c) => c.name === '__Secure-canchitas.session_token');
    expect(vencida?.maxAge).toBe(0);
    const yo = await app.inject({ method: 'GET', url: '/v1/cuentas/yo', headers: { cookie } });
    expect(yo.statusCode).toBe(401);
  });

  it('en Android borra la sesión y el dispositivo registrado con ella deja de recibir push', async () => {
    const datos = await cuentaVerificada();
    const inicio = (await iniciarConToken(datos.email, datos.contrasena)).json<{
      token: string;
      cuenta: { id: string };
    }>();
    const sesion = await deps.db
      .selectFrom('sesion')
      .select('id')
      .where('token', '=', inicio.token)
      .executeTakeFirstOrThrow();
    await deps.db
      .insertInto('dispositivo')
      .values({
        usuario_id: inicio.cuenta.id,
        plataforma: 'android',
        push_token: `fcm-${inicio.cuenta.id}`,
        sesion_id: sesion.id,
      })
      .execute();
    const authorization = `Bearer ${inicio.token}`;

    const cierre = await app.inject({
      method: 'DELETE',
      url: '/v1/cuentas/sesion',
      headers: { authorization },
    });

    expect(cierre.statusCode).toBe(204);
    const dispositivo = await deps.db
      .selectFrom('dispositivo')
      .select('id')
      .where('push_token', '=', `fcm-${inicio.cuenta.id}`)
      .executeTakeFirst();
    expect(dispositivo).toBeUndefined();
    const yo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { authorization },
    });
    expect(yo.statusCode).toBe(401);
  });

  it('cierra solo la sesión del dispositivo actual', async () => {
    const datos = await cuentaVerificada();
    const web = cookieDeSesion(await iniciar(datos.email, datos.contrasena));
    const android = (await iniciarConToken(datos.email, datos.contrasena)).json<{
      token: string;
    }>();

    await app.inject({ method: 'DELETE', url: '/v1/cuentas/sesion', headers: { cookie: web } });

    const yo = await app.inject({
      method: 'GET',
      url: '/v1/cuentas/yo',
      headers: { authorization: `Bearer ${android.token}` },
    });
    expect(yo.statusCode).toBe(200);
  });

  it('sin sesión responde 401', async () => {
    const respuesta = await app.inject({ method: 'DELETE', url: '/v1/cuentas/sesion' });
    expect(respuesta.statusCode).toBe(401);
  });
});

describe('ADR 0015 — datos personales fuera de los logs', () => {
  it('ningún log tiene mails, contraseñas ni tokens', () => {
    const todo = log.lineas.join('\n');
    expect(todo).not.toMatch(/persona\d+@mail\.com/);
    expect(todo).not.toContain('una-contrasena-segura');
    expect(todo).not.toContain('session_token=');
  });
});
