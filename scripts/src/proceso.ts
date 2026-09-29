// Utilidades para los scripts del repo: correr comandos y ubicar la raíz.
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Corre un comando heredando la salida; corta el script si falla. */
export function correr(comando: string, args: readonly string[]): void {
  const resultado = spawnSync(comando, args, { cwd: raiz, stdio: 'inherit' });
  if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1);
  }
}

export function fallar(mensaje: string): never {
  process.stderr.write(`${mensaje}\n`);
  process.exit(1);
}
