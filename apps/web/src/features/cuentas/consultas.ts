'use client';

// Consultas y mutaciones de cuentas sobre el cliente generado (ADR 0007). La API decide todo;
// acá solo se traduce la respuesta a algo que la pantalla sabe mostrar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type components } from '@/lib/api/cliente';

export type Cuenta = components['schemas']['Cuenta'];
export type SolicitudDeAlta = components['schemas']['SolicitudDeAltaInput'];

/** Error que la pantalla muestra: el sufijo del `type` del problem+json, o falta de red. */
export type ErrorDeCuentas =
  { tipo: 'api'; codigo: string } | { tipo: 'sin-conexion' } | { tipo: 'inesperado' };

const baseDeTipos = 'https://canchitas.app/errores/';

export const clavesDeCuentas = {
  actual: ['cuentas', 'actual'] as const,
};

class FallaDeCuentas extends Error {
  constructor(readonly detalle: ErrorDeCuentas) {
    super(detalle.tipo);
  }
}

export function detalleDeError(error: unknown): ErrorDeCuentas {
  return error instanceof FallaDeCuentas ? error.detalle : { tipo: 'inesperado' };
}

/** Llama a la API y convierte la respuesta de error en FallaDeCuentas. */
async function llamar<T>(
  pedido: () => Promise<{ data?: T; error?: { type: string }; response: Response }>,
): Promise<T | undefined> {
  let resultado;
  try {
    resultado = await pedido();
  } catch {
    throw new FallaDeCuentas({ tipo: 'sin-conexion' });
  }
  if (resultado.error !== undefined) {
    const { type } = resultado.error;
    throw new FallaDeCuentas(
      type.startsWith(baseDeTipos)
        ? { tipo: 'api', codigo: type.slice(baseDeTipos.length) }
        : { tipo: 'inesperado' },
    );
  }
  if (!resultado.response.ok) {
    throw new FallaDeCuentas({ tipo: 'inesperado' });
  }
  return resultado.data;
}

/** La cuenta de la sesión, o `null` si no hay sesión. */
export async function consultarCuentaActual(): Promise<Cuenta | null> {
  try {
    return (await llamar(() => api.GET('/v1/cuentas/yo'))) ?? null;
  } catch (error) {
    const detalle = detalleDeError(error);
    if (detalle.tipo === 'api' && detalle.codigo === 'sin-sesion') {
      return null;
    }
    throw error;
  }
}

export function useCuentaActual() {
  return useQuery({
    queryKey: clavesDeCuentas.actual,
    queryFn: consultarCuentaActual,
    retry: false,
  });
}

export function useRegistrar() {
  return useMutation({
    mutationFn: async (body: SolicitudDeAlta) => {
      const creada = await llamar(() => api.POST('/v1/cuentas', { body }));
      if (creada === undefined) {
        throw new FallaDeCuentas({ tipo: 'inesperado' });
      }
      return creada;
    },
  });
}

export function useIniciarSesion() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; contrasena: string }) =>
      llamar(() => api.POST('/v1/cuentas/sesion', { body })),
    onSuccess: (cuenta) => {
      cliente.setQueryData(clavesDeCuentas.actual, cuenta ?? null);
    },
  });
}

/** RF-007: al cerrar la sesión se borra todo lo que la web tenía en memoria. */
export function useCerrarSesion() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () => llamar(() => api.DELETE('/v1/cuentas/sesion')),
    onSettled: () => {
      cliente.clear();
      cliente.setQueryData(clavesDeCuentas.actual, null);
    },
  });
}

export function useVerificarEmail() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      llamar(() => api.POST('/v1/cuentas/verificacion', { body: { token } })),
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavesDeCuentas.actual }),
  });
}

export function useReenviarVerificacion() {
  return useMutation({
    mutationFn: (email: string) =>
      llamar(() => api.POST('/v1/cuentas/verificacion/reenvio', { body: { email } })),
  });
}

export function usePedirRecuperacion() {
  return useMutation({
    mutationFn: (email: string) =>
      llamar(() => api.POST('/v1/cuentas/recuperacion', { body: { email } })),
  });
}

export function useRestablecerContrasena() {
  return useMutation({
    mutationFn: (body: { token: string; contrasenaNueva: string }) =>
      llamar(() => api.POST('/v1/cuentas/recuperacion/confirmacion', { body })),
  });
}
