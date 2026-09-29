// Puertos del módulo de grupos. Las escrituras pasan por RepositorioDeGrupos; las lecturas, por
// ConsultasDeGrupos, que lee la vista v_grupo (apps/api/CLAUDE.md).
import type { Membresia } from '../domain/politicas.ts';

export interface GrupoNuevo {
  nombre: string;
  creadorUsuarioId: string;
  linkToken: string;
}

/** Resultado de unirse. `expulsado` solo aparece si lo expulsaron entre la lectura y la escritura. */
export type ResultadoDeUnirse = 'unido' | 'ya_era_miembro' | 'expulsado';

export interface RepositorioDeGrupos {
  /** Membresía del usuario en el grupo; `null` si nunca fue miembro o el grupo no existe. */
  membresia(grupoId: string, usuarioId: string): Promise<Membresia>;
  /** Crea el grupo con su creador como admin (RF-010), en una transacción. Devuelve el id. */
  crear(grupo: GrupoNuevo, instante: Date): Promise<string>;
  /** Id del grupo vigente con ese link; `null` si no hay (RF-011). */
  grupoDelLink(linkToken: string): Promise<string | null>;
  /**
   * Suma al usuario como jugador (RF-011). Si ya es miembro no hace nada; si había salido,
   * vuelve (RN-28); si lo expulsaron, no lo toca.
   */
  unir(grupoId: string, usuarioId: string, instante: Date): Promise<ResultadoDeUnirse>;
  /** Reemplaza el link: el anterior deja de encontrar el grupo (RF-012). */
  cambiarLink(grupoId: string, linkToken: string, instante: Date): Promise<void>;
}

export interface DatosDeGrupo {
  id: string;
  nombre: string;
  linkToken: string;
  cantidadMiembros: number;
}

export interface ResumenDeGrupo {
  id: string;
  nombre: string;
  cantidadMiembros: number;
  rol: 'jugador' | 'admin';
}

export interface ConsultasDeGrupos {
  grupo(grupoId: string): Promise<DatosDeGrupo | null>;
  grupoDelLink(linkToken: string): Promise<DatosDeGrupo | null>;
  /** Grupos donde el usuario es miembro vigente, por nombre. */
  gruposDe(usuarioId: string): Promise<readonly ResumenDeGrupo[]>;
}

export interface GeneradorDeLinks {
  /** Token nuevo, imposible de adivinar, para el link de invitación. */
  nuevoToken(): string;
}
