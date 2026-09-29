// Contra el mismo Postgres de dev (infra/postgres), con las migraciones aplicadas y conectado
// con el rol de la API (ADR 0005, ADR 0014).
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { construirApi } from '../src/composition/api.ts';
import { crearDependencias, type Dependencias } from '../src/composition/dependencias.ts';
import { loggerEnMemoria } from './apoyo.ts';

const raiz = join(import.meta.dirname, '..', '..', '..');

let postgres: StartedTestContainer;
let deps: Dependencias;

async function enPostgres(comando: string[]): Promise<void> {
  const { exitCode, output } = await postgres.exec(comando);
  if (exitCode !== 0) {
    throw new Error(output);
  }
}

beforeAll(async () => {
  const imagen = await GenericContainer.fromDockerfile(join(raiz, 'infra', 'postgres')).build(
    'canchitas-postgres:test',
    { deleteOnExit: false },
  );
  postgres = await imagen
    .withEnvironment({ POSTGRES_HOST_AUTH_METHOD: 'trust' })
    .withBindMounts([{ source: join(raiz, 'db'), target: '/db', mode: 'ro' }])
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();
  await enPostgres([
    'dbmate',
    '--url',
    'postgres://postgres@localhost:5432/canchitas?sslmode=disable',
    '--migrations-dir',
    '/db/migrations',
    '--no-dump-schema',
    'up',
  ]);
  // Contraseña de un solo uso: el contenedor vive lo que dura el test.
  const clave = randomUUID();
  await enPostgres([
    'psql',
    '-U',
    'postgres',
    '-c',
    `ALTER ROLE canchitas_api PASSWORD '${clave}'`,
  ]);

  const url = `postgres://canchitas_api:${clave}@${postgres.getHost()}:${String(postgres.getMappedPort(5432))}/canchitas`;
  deps = crearDependencias(
    { DATABASE_URL: url, PORT: 0, HOST: '127.0.0.1', LOG_LEVEL: 'silent', APP_VERSION: 'test' },
    'api',
  );
});

afterAll(async () => {
  await deps.cerrar();
  await postgres.stop();
});

describe('M0 — GET /v1/salud contra Postgres', () => {
  it('responde 200 conectada con el rol canchitas_api', async () => {
    const app = await construirApi({
      logger: loggerEnMemoria().logger,
      consultarSalud: deps.consultarSalud,
    });

    const respuesta = await app.inject({ method: 'GET', url: '/v1/salud' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toMatchObject({ estado: 'ok', version: 'test' });
  });
});
