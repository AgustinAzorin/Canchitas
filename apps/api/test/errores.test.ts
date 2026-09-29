import { ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import { construirApi } from '../src/composition/api.ts';
import { cuentasInertes } from '../src/composition/cuentas-inertes.ts';
import { relojDelSistema } from '../src/shared/clock.ts';
import { loggerEnMemoria } from './apoyo.ts';

describe('ADR 0008 — errores HTTP como problem+json', () => {
  it('una ruta inexistente responde 404 con problem+json', async () => {
    const app = await construirApi({
      cuentas: cuentasInertes,
      clock: relojDelSistema,
      logger: loggerEnMemoria().logger,
      consultarSalud: () =>
        Promise.resolve(ok({ estado: 'ok', version: 'x', instante: new Date(0) })),
    });

    const respuesta = await app.inject({ method: 'GET', url: '/v1/no-existe' });

    expect(respuesta.statusCode).toBe(404);
    expect(respuesta.headers['content-type']).toContain('application/problem+json');
    expect(respuesta.json()).toEqual({
      type: 'https://canchitas.app/errores/no-encontrado',
      title: 'No existe el recurso',
      status: 404,
      instance: '/v1/no-existe',
    });
  });

  it('un error inesperado responde 500 sin mostrar el mensaje interno', async () => {
    const { logger, lineas } = loggerEnMemoria();
    const app = await construirApi({
      cuentas: cuentasInertes,
      clock: relojDelSistema,
      logger,
      consultarSalud: () => Promise.reject(new Error('detalle interno de Postgres')),
    });

    const respuesta = await app.inject({ method: 'GET', url: '/v1/salud' });

    expect(respuesta.statusCode).toBe(500);
    expect(respuesta.headers['content-type']).toContain('application/problem+json');
    expect(respuesta.body).not.toContain('detalle interno');
    expect(respuesta.json()).toMatchObject({
      type: 'https://canchitas.app/errores/interno',
      status: 500,
    });
    expect(lineas.join('')).toContain('detalle interno de Postgres');
  });
});
