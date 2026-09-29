// Punto de entrada del worker (ADR 0006). En M0 solo verifica la base y espera: el outbox y
// pg-boss llegan en M2.
import { crearDependencias } from './composition/dependencias.ts';
import { leerConfig } from './shared/config.ts';

const config = leerConfig(process.env);
const deps = crearDependencias(config, 'worker');

const salud = await deps.consultarSalud();
if (salud.isErr()) {
  deps.logger.fatal('la base no responde');
  await deps.cerrar();
  process.exit(1);
}
deps.logger.info('worker listo; sin trabajos todavía');

// Mantiene vivo el proceso hasta recibir una señal de apagado.
const espera = setInterval(() => undefined, 60_000);

async function apagar(senal: string): Promise<void> {
  deps.logger.info({ senal }, 'apagando');
  clearInterval(espera);
  await deps.cerrar();
}

process.once('SIGTERM', () => void apagar('SIGTERM'));
process.once('SIGINT', () => void apagar('SIGINT'));
