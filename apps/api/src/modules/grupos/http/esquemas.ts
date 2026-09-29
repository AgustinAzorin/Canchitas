// Esquemas de /v1/grupos y /v1/invitaciones (ADR 0007). El formato es la primera barrera; las
// reglas (nombre, permisos) las decide el caso de uso con el módulo de políticas.
import { z } from 'zod';

export const SolicitudDeGrupo = z
  .object({
    nombre: z
      .string()
      .max(200)
      .describe('De 1 a 60 caracteres sin contar los espacios de los extremos (RF-010)'),
  })
  .meta({ id: 'SolicitudDeGrupo' });

export const RolEnGrupo = z.enum(['jugador', 'admin']).meta({ id: 'RolEnGrupo' });

export const AccionDeGrupo = z
  .enum([
    'ver_link',
    'regenerar_link',
    'crear_votacion',
    'crear_partido',
    'armar_equipos',
    'cargar_resultado',
    'registrar_costo',
    'marcar_pago',
  ])
  .meta({
    id: 'AccionDeGrupo',
    description:
      'Acción que el rol permite en el grupo (RN-07, RN-26). Los clientes muestran solo estas.',
  });

export const Grupo = z
  .object({
    id: z.uuid(),
    nombre: z.string(),
    cantidadMiembros: z.int().min(0),
    rol: RolEnGrupo,
    link: z
      .url()
      .nullable()
      .describe(
        'Link de invitación vigente (RF-011). Solo lo ven los admins (RN-26); si no, null.',
      ),
    acciones: z.array(AccionDeGrupo),
  })
  .meta({ id: 'Grupo' });

export const ResumenDeGrupo = z
  .object({
    id: z.uuid(),
    nombre: z.string(),
    cantidadMiembros: z.int().min(0),
    rol: RolEnGrupo,
  })
  .meta({ id: 'ResumenDeGrupo' });

export const ListaDeGrupos = z
  .object({ grupos: z.array(ResumenDeGrupo) })
  .meta({ id: 'ListaDeGrupos' });

export const ParametrosDeGrupo = z.object({ grupoId: z.uuid() });

export const ParametrosDeInvitacion = z.object({
  token: z.string().min(1).max(128).describe('Token del link de invitación'),
});

export const EstadoDeInvitacion = z
  .enum(['puede_unirse', 'ya_es_miembro', 'cuenta_sin_verificar', 'expulsado'])
  .meta({
    id: 'EstadoDeInvitacion',
    description:
      'Qué pasa si acepta: se une; ya es miembro y va al grupo (RF-011); tiene que verificar el mail (RF-004); o fue expulsado y no puede volver por link (RN-28).',
  });

export const Invitacion = z
  .object({
    grupoId: z.uuid(),
    nombre: z.string(),
    cantidadMiembros: z.int().min(0),
    estado: EstadoDeInvitacion,
  })
  .meta({ id: 'Invitacion' });

export const Union = z
  .object({
    grupoId: z.uuid(),
    yaEraMiembro: z.boolean().describe('true si ya era miembro: no se duplicó la membresía'),
  })
  .meta({ id: 'Union' });
