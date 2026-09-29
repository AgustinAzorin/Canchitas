// Catálogo de errores de /v1/grupos y /v1/invitaciones como problem+json (ADR 0008). Cada motivo
// de rechazo del módulo de políticas tiene el suyo.
import type { Problem } from '../../../shared/http/problem.ts';

const base = 'https://canchitas.app/errores/';

export const problemasDeGrupos = {
  nombreDeGrupoInvalido: {
    type: `${base}nombre-de-grupo-invalido`,
    title: 'El nombre del grupo tiene que tener entre 1 y 60 caracteres',
    status: 422,
    requisito: 'RF-010',
  },
  cuentaSinVerificar: {
    type: `${base}cuenta-sin-verificar`,
    title: 'Hay que verificar el mail antes de crear un grupo o unirse a uno',
    status: 403,
    requisito: 'RF-004',
  },
  grupoNoEncontrado: {
    type: `${base}grupo-no-encontrado`,
    title: 'El grupo no existe o no sos miembro',
    status: 404,
    requisito: 'RNF-013',
  },
  requiereAdmin: {
    type: `${base}requiere-admin`,
    title: 'Solo un admin del grupo puede hacer esto',
    status: 403,
    requisito: 'RN-07',
  },
  expulsado: {
    type: `${base}expulsado-del-grupo`,
    title: 'Te expulsaron de este grupo: solo un admin puede volver a agregarte',
    status: 403,
    requisito: 'RN-28',
  },
  linkInvalido: {
    type: `${base}link-invalido`,
    title: 'El link de invitación ya no es válido',
    status: 404,
    requisito: 'RF-011',
  },
} as const satisfies Record<string, Problem>;
