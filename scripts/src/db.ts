// Comandos de la base en dev y CI (db/CLAUDE.md). Todo corre dentro del contenedor de
// Postgres de infra/compose: así dbmate, pg_dump y pg_prove son siempre las mismas versiones.
//   node scripts/src/db.ts <up|migrate|rollback|new <nombre>|test|lint|reset>
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { correr, fallar, raiz } from './proceso.ts';

const compose = ['compose', '-f', 'infra/compose/docker-compose.yml'];
const bases = { app: 'canchitas', test: 'canchitas_test' } as const;
const rolesDeLaApp = ['canchitas_migrator', 'canchitas_api', 'canchitas_worker', 'canchitas_readonly'];

/** Primera migración que ya encuentra los roles: desde acá todas hacen SET LOCAL ROLE. */
const migracionDeRoles = '20260928215000';

function enPostgres(args: readonly string[]): void {
  correr('docker', [...compose, 'exec', '-T', 'postgres', ...args]);
}

function dbmate(base: string, ...args: string[]): void {
  const esquema = base === bases.app ? ['--schema-file', '/db/schema.sql'] : ['--no-dump-schema'];
  enPostgres([
    'dbmate',
    '--url',
    `postgres://postgres@localhost:5432/${base}?sslmode=disable`,
    '--migrations-dir',
    '/db/migrations',
    ...esquema,
    ...args,
  ]);
}

/** En dev la contraseña de cada rol es su nombre. En staging y prod la pone infra con SOPS. */
function contrasenasDeDev(): void {
  const sql = rolesDeLaApp.map((rol) => `ALTER ROLE ${rol} PASSWORD '${rol}';`).join(' ');
  enPostgres(['psql', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-qc', sql]);
}

function nuevaMigracion(nombre: string | undefined): void {
  if (nombre === undefined || !/^[a-z][a-z0-9_]*$/.test(nombre)) {
    fallar('Uso: pnpm db:new <nombre_en_snake_case>');
  }
  const marca = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const archivo = join(raiz, 'db', 'migrations', `${marca}_${nombre}.sql`);
  const encabezado = [
    "SET LOCAL lock_timeout = '5s';",
    "SET LOCAL statement_timeout = '60s';",
    'SET LOCAL ROLE canchitas_migrator;',
  ].join('\n');
  writeFileSync(archivo, `-- migrate:up\n${encabezado}\n\n-- migrate:down\n${encabezado}\n`, {
    flag: 'wx',
  });
  process.stdout.write(`Creada ${archivo}\n`);
}

/** squawk sobre todas las migraciones y la convención de rol desde la migración de roles. */
function lint(): void {
  const directorio = join(raiz, 'db', 'migrations');
  const archivos = readdirSync(directorio)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();
  const sinRol = archivos
    .filter((archivo) => archivo.slice(0, 14) > migracionDeRoles)
    .filter((archivo) => {
      const secciones = readFileSync(join(directorio, archivo), 'utf8').split('-- migrate:down');
      return !secciones.every((seccion) => seccion.includes('SET LOCAL ROLE canchitas_migrator;'));
    });
  if (sinRol.length > 0) {
    fallar(
      `Estas migraciones no empiezan up y down con SET LOCAL ROLE canchitas_migrator:\n${sinRol.join('\n')}`,
    );
  }
  correr('pnpm', ['exec', 'squawk', ...archivos.map((archivo) => join('db', 'migrations', archivo))]);
}

const [comando, argumento] = process.argv.slice(2);

switch (comando) {
  case 'up':
    correr('docker', [...compose, 'up', '-d', '--build', '--wait', 'postgres']);
    break;
  case 'migrate':
    dbmate(bases.app, 'up');
    dbmate(bases.test, 'up');
    contrasenasDeDev();
    break;
  case 'rollback':
    dbmate(bases.app, 'rollback');
    dbmate(bases.test, 'rollback');
    break;
  case 'new':
    nuevaMigracion(argumento);
    break;
  case 'test':
    enPostgres(['sh', '-c', `pg_prove -U postgres -d ${bases.test} /db/tests/*_test.sql`]);
    break;
  case 'lint':
    lint();
    break;
  case 'reset':
    correr('docker', [...compose, 'down', '-v', 'postgres']);
    break;
  default:
    fallar('Uso: node scripts/src/db.ts <up|migrate|rollback|new <nombre>|test|lint|reset>');
}
