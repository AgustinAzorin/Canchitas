// Piezas de infraestructura que no necesitan base: hash de contraseñas y logs sin mails.
import { describe, expect, it } from 'vitest';

import { sinEmails } from '../../src/modules/cuentas/infrastructure/better-auth.ts';
import { crearHashArgon2 } from '../../src/modules/cuentas/infrastructure/hash-argon2.ts';
import { textosDeMails } from '../../src/modules/cuentas/infrastructure/textos-de-mails.ts';

describe('RNF-009 — contraseñas con argon2id', () => {
  const argon2 = crearHashArgon2({ memoria: 8_192, pasadas: 1 });

  it('guarda un hash argon2id con sal y costo, nunca la contraseña', async () => {
    const hash = await argon2.hash('mi-contrasena');
    expect(hash).toMatch(
      /^\$argon2id\$v=19\$m=8192,t=1,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
    );
    expect(hash).not.toContain('mi-contrasena');
  });

  it('la misma contraseña da hashes distintos (sal aleatoria)', async () => {
    expect(await argon2.hash('igual')).not.toBe(await argon2.hash('igual'));
  });

  it('verifica la contraseña correcta y rechaza otra', async () => {
    const hash = await argon2.hash('correcta');
    expect(await argon2.verify({ hash, password: 'correcta' })).toBe(true);
    expect(await argon2.verify({ hash, password: 'incorrecta' })).toBe(false);
  });

  it('verifica con el costo del hash guardado aunque cambie la configuración', async () => {
    const viejo = await argon2.hash('correcta');
    const nuevo = crearHashArgon2({ memoria: 16_384, pasadas: 2 });
    expect(await nuevo.verify({ hash: viejo, password: 'correcta' })).toBe(true);
  });

  it('rechaza un hash con otro formato', async () => {
    expect(await argon2.verify({ hash: 'scrypt:abc', password: 'x' })).toBe(false);
  });
});

describe('ADR 0015 — logs de Better Auth sin mails', () => {
  it('borra los mails de los mensajes', () => {
    expect(sinEmails('Sign-up attempt for existing email: ana@mail.com')).toBe(
      'Sign-up attempt for existing email: [redactado]',
    );
  });
});

describe('RI-003 — textos de los mails', () => {
  it('llevan el enlace, sin exclamaciones', () => {
    for (const mail of Object.values(textosDeMails)) {
      const texto = mail.texto('https://canchitas.app/x#token=abc');
      expect(texto).toContain('https://canchitas.app/x#token=abc');
      expect(`${mail.asunto}${texto}`).not.toMatch(/[!¡]/);
    }
  });
});
