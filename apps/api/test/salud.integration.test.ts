// Contra el mismo Postgres de dev (infra/postgres), con las migraciones aplicadas y conectado
// con el rol de la API (ADR 0005, ADR 0014).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { construirApi } from '../src/composition/api.ts';
import { cuentasInertes } from '../src/composition/cuentas-inertes.ts';
import { dependenciasDeGruposInertes } from '../src/composition/grupos-inertes.ts';
import { crearDependencias, type Dependencias } from '../src/composition/dependencias.ts';
import { relojDelSistema } from '../src/shared/clock.ts';
import { loggerEnMemoria } from './apoyo.ts';
import { levantarPostgres, type PostgresDePrueba } from './postgres.ts';

let postgres: PostgresDePrueba;
let deps: Dependencias;

beforeAll(async () => {
  postgres = await levantarPostgres();
  deps = crearDependencias(
    {
      DATABASE_URL: postgres.url,
      PORT: 0,
      HOST: '127.0.0.1',
      LOG_LEVEL: 'silent',
      APP_VERSION: 'test',
    },
    'api',
  );
});

afterAll(async () => {
  await deps.cerrar();
  await postgres.detener();
});

describe('M0 — GET /v1/salud contra Postgres', () => {
  it('responde 200 conectada con el rol canchitas_api', async () => {
    const app = await construirApi({
      cuentas: cuentasInertes,
      ...dependenciasDeGruposInertes,
      clock: relojDelSistema,
      logger: loggerEnMemoria().logger,
      consultarSalud: deps.consultarSalud,
    });

    const respuesta = await app.inject({ method: 'GET', url: '/v1/salud' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ estado: 'ok', version: 'test' });
  });
});
