// Punto de entrada HTTP (ADR 0006: misma imagen que el worker, otro comando).
import { construirApi } from './composition/api.ts';
import { crearCuentas, crearEnviadorDeMails } from './composition/cuentas.ts';
import { crearDependencias } from './composition/dependencias.ts';
import { autenticarConCuentas, crearGrupos } from './composition/grupos.ts';
import { relojDelSistema } from './shared/clock.ts';
import { leerConfigDeApi } from './shared/config.ts';

const config = leerConfigDeApi(process.env);
const deps = crearDependencias(config, 'api');
const cuentas = crearCuentas({
  config,
  db: deps.db,
  logger: deps.logger,
  clock: relojDelSistema,
  mails: crearEnviadorDeMails(config),
});
const app = await construirApi({
  ...deps,
  cuentas,
  grupos: crearGrupos({ db: deps.db, clock: relojDelSistema }),
  autenticar: autenticarConCuentas(cuentas),
  urlDeLaWeb: config.URL_WEB,
  clock: relojDelSistema,
});

async function apagar(senal: string): Promise<void> {
  app.log.info({ senal }, 'apagando');
  await app.close();
  await deps.cerrar();
}

process.once('SIGTERM', () => void apagar('SIGTERM'));
process.once('SIGINT', () => void apagar('SIGINT'));

await app.listen({ port: config.PORT, host: config.HOST });
