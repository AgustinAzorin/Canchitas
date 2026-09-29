// Punto de entrada HTTP (ADR 0006: misma imagen que el worker, otro comando).
import { construirApi } from './composition/api.ts';
import { crearDependencias } from './composition/dependencias.ts';
import { leerConfig } from './shared/config.ts';

const config = leerConfig(process.env);
const deps = crearDependencias(config, 'api');
const app = await construirApi(deps);

async function apagar(senal: string): Promise<void> {
  app.log.info({ senal }, 'apagando');
  await app.close();
  await deps.cerrar();
}

process.once('SIGTERM', () => void apagar('SIGTERM'));
process.once('SIGINT', () => void apagar('SIGINT'));

await app.listen({ port: config.PORT, host: config.HOST });
