// Postgres real para los tests de integración (ADR 0014): la misma imagen de dev
// (infra/postgres), con las migraciones aplicadas y conectado con el rol de la API (ADR 0005).
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';

const raiz = join(import.meta.dirname, '..', '..', '..');

export interface PostgresDePrueba {
  /** URL con el rol canchitas_api. */
  url: string;
  detener(): Promise<void>;
}

export async function levantarPostgres(): Promise<PostgresDePrueba> {
  const imagen = await GenericContainer.fromDockerfile(join(raiz, 'infra', 'postgres')).build(
    'canchitas-postgres:test',
    { deleteOnExit: false },
  );
  const postgres: StartedTestContainer = await imagen
    .withEnvironment({ POSTGRES_HOST_AUTH_METHOD: 'trust' })
    .withBindMounts([{ source: join(raiz, 'db'), target: '/db', mode: 'ro' }])
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

  async function enPostgres(comando: string[]): Promise<void> {
    const { exitCode, output } = await postgres.exec(comando);
    if (exitCode !== 0) {
      throw new Error(output);
    }
  }

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

  return {
    url: `postgres://canchitas_api:${clave}@${postgres.getHost()}:${String(postgres.getMappedPort(5432))}/canchitas`,
    detener: async () => {
      await postgres.stop();
    },
  };
}
