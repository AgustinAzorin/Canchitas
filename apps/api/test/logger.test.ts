import { describe, expect, it } from 'vitest';

import { loggerEnMemoria } from './apoyo.ts';

describe('ADR 0015 — los logs no guardan datos personales', () => {
  it('redacta mails, contraseñas, tokens y fechas de nacimiento', () => {
    const { logger, lineas } = loggerEnMemoria();

    logger.info({
      usuario: { email: 'ana@mail.com', password: 'secreta', fecha_nacimiento: '2000-01-01' },
      token: 'abc123',
      req: { headers: { authorization: 'Bearer abc123', cookie: 'sesion=abc123' } },
    });

    const salida = lineas.join('');
    expect(salida).not.toContain('ana@mail.com');
    expect(salida).not.toContain('secreta');
    expect(salida).not.toContain('2000-01-01');
    expect(salida).not.toContain('abc123');
    expect(salida).toContain('[redactado]');
  });
});
