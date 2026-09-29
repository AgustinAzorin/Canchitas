// RNF-009: contraseñas con argon2id (hash con sal y costo configurable), con el argon2 de
// node:crypto. Better Auth usa scrypt por defecto; el SRS pide bcrypt o argon2.
// Formato PHC: $argon2id$v=19$m=<KiB>,t=<pasadas>,p=<paralelismo>$<sal>$<hash>, en base64 sin relleno.
import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';

export interface CostoArgon2 {
  /** Memoria en KiB. */
  memoria: number;
  pasadas: number;
}

const paralelismo = 1;
const largoDeSal = 16;
const largoDeHash = 32;

function derivar(
  contrasena: string,
  sal: Buffer,
  memoria: number,
  pasadas: number,
  largo: number,
): Promise<Buffer> {
  return new Promise((resolver, rechazar) => {
    argon2(
      'argon2id',
      {
        message: contrasena,
        nonce: sal,
        parallelism: paralelismo,
        tagLength: largo,
        memory: memoria,
        passes: pasadas,
      },
      (error, clave) => {
        if (error === null) {
          resolver(clave);
        } else {
          rechazar(error);
        }
      },
    );
  });
}

function base64(buffer: Buffer): string {
  return buffer.toString('base64').replace(/=+$/, '');
}

export function crearHashArgon2(costo: CostoArgon2): {
  hash(contrasena: string): Promise<string>;
  verify(datos: { hash: string; password: string }): Promise<boolean>;
} {
  return {
    async hash(contrasena) {
      const sal = randomBytes(largoDeSal);
      const clave = await derivar(contrasena, sal, costo.memoria, costo.pasadas, largoDeHash);
      return `$argon2id$v=19$m=${String(costo.memoria)},t=${String(costo.pasadas)},p=${String(paralelismo)}$${base64(sal)}$${base64(clave)}`;
    },
    // Verifica con el costo guardado en el hash, así subir el costo no invalida los hashes viejos.
    async verify({ hash, password }) {
      const partes =
        /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=1\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/.exec(hash);
      if (partes === null) {
        return false;
      }
      const [, memoria, pasadas, sal, esperado] = partes;
      const clave = Buffer.from(esperado ?? '', 'base64');
      const calculada = await derivar(
        password,
        Buffer.from(sal ?? '', 'base64'),
        Number(memoria),
        Number(pasadas),
        clave.length,
      );
      return timingSafeEqual(calculada, clave);
    },
  };
}
