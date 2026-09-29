// Configuración para el CLI de Better Auth (`pnpm --filter @canchitas/api auth:sql`): compara su
// esquema con la base de dev y escribe el SQL que falta. Ese SQL no se aplica tal cual: se revisa
// y se pasa a una migración de dbmate (ADR 0009, db/CLAUDE.md).
import { crearAuth } from './src/modules/cuentas/infrastructure/better-auth.ts';
import { conectar } from './src/shared/db/conexion.ts';

const sinMails = {
  enviarVerificacion: () => Promise.resolve(),
  enviarRecuperacion: () => Promise.resolve(),
};

export const auth = crearAuth({
  db: conectar('postgres://canchitas_readonly:canchitas_readonly@localhost:5433/canchitas'),
  secreto: 'solo-para-generar-el-esquema-de-better-auth',
  urlDeLaApi: 'http://localhost:8080',
  urlDeLaWeb: 'http://localhost:8080',
  mails: sinMails,
  costo: { memoria: 19_456, pasadas: 2 },
  registrar: () => undefined,
});
