// Errores de dominio del módulo de grupos (ADR 0008).
export type { NombreDeGrupoInvalido } from './nombre-de-grupo.ts';
export type { NoAutorizado } from './politicas.ts';

/** RF-011: el link no existe o se regeneró (RF-012). No se distingue uno de otro. */
export interface LinkInvalido {
  tipo: 'LinkInvalido';
}
