// Errores HTTP como application/problem+json (RFC 9457, ADR 0008). El cliente decide qué
// mostrar según `type`, que es estable; `title` es un texto en español para humanos.
import { z } from 'zod';

export const tipoDeContenidoProblem = 'application/problem+json';

const baseDeTipos = 'https://canchitas.app/errores/';

export const Problem = z
  .object({
    type: z.url(),
    title: z.string(),
    status: z.int().min(100).max(599),
    detail: z.string().optional(),
    instance: z.string().optional(),
    requisito: z.string().optional().describe('ID del requisito del SRS, si aplica'),
    errores: z
      .array(z.object({ campo: z.string(), mensaje: z.string() }))
      .optional()
      .describe('Detalle por campo cuando la solicitud no es válida'),
  })
  .meta({ id: 'Problem' });

export type Problem = z.infer<typeof Problem>;

export const problemas = {
  solicitudInvalida: {
    type: `${baseDeTipos}solicitud-invalida`,
    title: 'La solicitud no es válida',
    status: 400,
  },
  noEncontrado: { type: `${baseDeTipos}no-encontrado`, title: 'No existe el recurso', status: 404 },
  servicioNoDisponible: {
    type: `${baseDeTipos}servicio-no-disponible`,
    title: 'El servicio no está disponible',
    status: 503,
  },
  interno: { type: `${baseDeTipos}interno`, title: 'Ocurrió un error inesperado', status: 500 },
} as const satisfies Record<string, Problem>;

/** Esquema de respuesta para declarar un error en una ruta y en el contrato. */
export const respuestaProblem = {
  content: { [tipoDeContenidoProblem]: { schema: Problem } },
} as const;
