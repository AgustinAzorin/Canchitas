'use client';

// Consultas y mutaciones de cuentas sobre el cliente generado (ADR 0007). La API decide todo;
// acá solo se traduce la respuesta a algo que la pantalla sabe mostrar.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type components } from '@/lib/api/cliente';
import { detalleDeError, esError, llamar, llamarConDatos, type ErrorDeApi } from '@/lib/api/llamar';

export type Cuenta = components['schemas']['Cuenta'];
export type SolicitudDeAlta = components['schemas']['SolicitudDeAltaInput'];

export type ErrorDeCuentas = ErrorDeApi;
export { detalleDeError };

export const clavesDeCuentas = {
  actual: ['cuentas', 'actual'] as const,
};

/** La cuenta de la sesión, o `null` si no hay sesión. */
export async function consultarCuentaActual(): Promise<Cuenta | null> {
  try {
    return (await llamar(() => api.GET('/v1/cuentas/yo'))) ?? null;
  } catch (error) {
    if (esError(error, 'sin-sesion')) {
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
    mutationFn: (body: SolicitudDeAlta) => llamarConDatos(() => api.POST('/v1/cuentas', { body })),
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
