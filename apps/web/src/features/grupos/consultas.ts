'use client';

// Consultas y mutaciones de grupos sobre el cliente generado (ADR 0007). Qué puede hacer cada uno
// lo dice la API (`acciones`, `link`, `estado`): acá no se decide ningún permiso.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type components } from '@/lib/api/cliente';
import { llamarConDatos } from '@/lib/api/llamar';

export type Grupo = components['schemas']['Grupo'];
export type ResumenDeGrupo = components['schemas']['ResumenDeGrupo'];
export type Invitacion = components['schemas']['Invitacion'];
export type AccionDeGrupo = components['schemas']['AccionDeGrupo'];

export const clavesDeGrupos = {
  todos: ['grupos'] as const,
  mios: ['grupos', 'mios'] as const,
  grupo: (id: string) => ['grupos', 'detalle', id] as const,
  invitacion: (token: string) => ['grupos', 'invitacion', token] as const,
};

export function useMisGrupos(habilitada: boolean) {
  return useQuery({
    queryKey: clavesDeGrupos.mios,
    queryFn: () => llamarConDatos(() => api.GET('/v1/grupos')),
    enabled: habilitada,
    retry: false,
  });
}

export function useGrupo(grupoId: string) {
  return useQuery({
    queryKey: clavesDeGrupos.grupo(grupoId),
    queryFn: () =>
      llamarConDatos(() => api.GET('/v1/grupos/{grupoId}', { params: { path: { grupoId } } })),
    retry: false,
  });
}

/** RF-010 */
export function useCrearGrupo() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (nombre: string) =>
      llamarConDatos(() => api.POST('/v1/grupos', { body: { nombre } })),
    onSuccess: (grupo) => {
      cliente.setQueryData(clavesDeGrupos.grupo(grupo.id), grupo);
      return cliente.invalidateQueries({ queryKey: clavesDeGrupos.mios });
    },
  });
}

/** RF-012 */
export function useRegenerarLink(grupoId: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () =>
      llamarConDatos(() =>
        api.POST('/v1/grupos/{grupoId}/link/regeneracion', { params: { path: { grupoId } } }),
      ),
    onSuccess: (grupo) => {
      cliente.setQueryData(clavesDeGrupos.grupo(grupoId), grupo);
    },
  });
}

/** RF-011 y RN-27: la vista previa solo se pide con sesión. */
export function useInvitacion(token: string, habilitada: boolean) {
  return useQuery({
    queryKey: clavesDeGrupos.invitacion(token),
    queryFn: () =>
      llamarConDatos(() => api.GET('/v1/invitaciones/{token}', { params: { path: { token } } })),
    enabled: habilitada,
    retry: false,
  });
}

/** RF-011 */
export function useUnirse(token: string) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: () =>
      llamarConDatos(() =>
        api.POST('/v1/invitaciones/{token}/aceptacion', { params: { path: { token } } }),
      ),
    onSuccess: () => cliente.invalidateQueries({ queryKey: clavesDeGrupos.todos }),
  });
}
