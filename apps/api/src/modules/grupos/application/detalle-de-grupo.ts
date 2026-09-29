// Cómo ve el grupo cada miembro: el link solo si su rol lo permite (RN-26) y la lista de acciones
// que puede hacer, para que los clientes muestren solo esas (RN-07). Los clientes no deciden
// permisos: los leen de acá.
import { accionesPermitidas, decidir, type Accion } from '../domain/politicas.ts';
import type { DatosDeGrupo } from './puertos.ts';

/** Acciones sobre un grupo que se ofrecen en pantalla; crear, unirse y verlo no son botones del grupo. */
export type AccionSobreElGrupo = Exclude<
  Accion,
  'listar_mis_grupos' | 'crear_grupo' | 'ver_invitacion' | 'unirse_por_link' | 'ver_grupo'
>;

const accionesSobreElGrupo: ReadonlySet<Accion> = new Set<AccionSobreElGrupo>([
  'ver_link',
  'regenerar_link',
  'crear_votacion',
  'crear_partido',
  'armar_equipos',
  'cargar_resultado',
  'registrar_costo',
  'marcar_pago',
]);

export interface DetalleDeGrupo {
  id: string;
  nombre: string;
  cantidadMiembros: number;
  rol: 'jugador' | 'admin';
  /** `null` si el rol no puede ver el link (RN-26). */
  linkToken: string | null;
  acciones: readonly AccionSobreElGrupo[];
}

const esSobreElGrupo = (accion: Accion): accion is AccionSobreElGrupo =>
  accionesSobreElGrupo.has(accion);

export function detalleDeGrupo(datos: DatosDeGrupo, rol: 'jugador' | 'admin'): DetalleDeGrupo {
  return {
    id: datos.id,
    nombre: datos.nombre,
    cantidadMiembros: datos.cantidadMiembros,
    rol,
    linkToken: decidir('ver_link', rol).permitida ? datos.linkToken : null,
    acciones: accionesPermitidas(rol).filter(esSobreElGrupo),
  };
}
