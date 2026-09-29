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

  it('RF-011: la URL se loguea sin el token del link de invitación', () => {
    const { logger, lineas } = loggerEnMemoria();

    logger.info({ req: { method: 'GET', url: '/v1/invitaciones/tok-secreto/aceptacion?x=1' } });
    logger.info({ req: { method: 'GET', url: '/v1/grupos' } });

    const salida = lineas.join('');
    expect(salida).not.toContain('tok-secreto');
    expect(salida).toContain('/v1/invitaciones/[redactado]/aceptacion?x=1');
    expect(salida).toContain('"url":"/v1/grupos"');
  });
});
