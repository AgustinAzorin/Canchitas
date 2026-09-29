import { err, ok } from 'neverthrow';
import { describe, expect, it } from 'vitest';

import { crearConsultarSalud } from '../src/salud/application/consultar-salud.ts';
import { construirApi } from '../src/composition/api.ts';
import { loggerEnMemoria } from './apoyo.ts';

const instante = new Date('2026-09-28T21:00:00.000Z');
const reloj = { ahora: () => instante };

describe('M0 — consultar salud', () => {
  it('devuelve la versión y la hora del reloj cuando la base responde', async () => {
    const consultar = crearConsultarSalud({
      sonda: { responde: () => Promise.resolve(true) },
      clock: reloj,
      version: '1.2.3',
    });

    const resultado = await consultar();

    expect(resultado._unsafeUnwrap()).toEqual({ estado: 'ok', version: '1.2.3', instante });
  });

  it('devuelve BaseNoDisponible cuando la base no responde', async () => {
    const consultar = crearConsultarSalud({
      sonda: { responde: () => Promise.resolve(false) },
      clock: reloj,
      version: '1.2.3',
    });

    const resultado = await consultar();

    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'BaseNoDisponible' });
  });
});

describe('M0 — GET /v1/salud', () => {
  it('responde 200 con el estado', async () => {
    const app = await construirApi({
      logger: loggerEnMemoria().logger,
      consultarSalud: () => Promise.resolve(ok({ estado: 'ok', version: '1.2.3', instante })),
    });

    const respuesta = await app.inject({ method: 'GET', url: '/v1/salud' });

    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.json()).toEqual({
      estado: 'ok',
      version: '1.2.3',
      instante: '2026-09-28T21:00:00.000Z',
    });
  });

  it('responde 503 con problem+json si la base no responde', async () => {
    const app = await construirApi({
      logger: loggerEnMemoria().logger,
      consultarSalud: () => Promise.resolve(err({ tipo: 'BaseNoDisponible' })),
    });

    const respuesta = await app.inject({ method: 'GET', url: '/v1/salud' });

    expect(respuesta.statusCode).toBe(503);
    expect(respuesta.headers['content-type']).toContain('application/problem+json');
    expect(respuesta.json()).toMatchObject({
      type: 'https://canchitas.app/errores/servicio-no-disponible',
      status: 503,
      instance: '/v1/salud',
    });
  });
});
