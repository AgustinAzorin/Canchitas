'use client';

// Estado de la API (/v1/salud) para la pantalla de inicio de M0.
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api/cliente';

export type EstadoDeLaApi =
  | { tipo: 'en-linea'; version: string; instante: Date }
  | { tipo: 'base-caida' }
  | { tipo: 'sin-conexion' };

export const clavesDeSalud = {
  estado: ['salud', 'estado'] as const,
};

const tipoBaseCaida = 'https://canchitas.app/errores/servicio-no-disponible';

/** Nunca lanza: traduce cada respuesta a un estado que la pantalla sabe mostrar. */
export async function consultarEstado(): Promise<EstadoDeLaApi> {
  try {
    const { data, error } = await api.GET('/v1/salud');
    if (data !== undefined) {
      return { tipo: 'en-linea', version: data.version, instante: new Date(data.instante) };
    }
    return error.type === tipoBaseCaida ? { tipo: 'base-caida' } : { tipo: 'sin-conexion' };
  } catch {
    return { tipo: 'sin-conexion' };
  }
}

export function useEstadoDeLaApi() {
  return useQuery({
    queryKey: clavesDeSalud.estado,
    queryFn: consultarEstado,
    refetchInterval: 10_000,
  });
}
