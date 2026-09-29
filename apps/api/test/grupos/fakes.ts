// Puertos del módulo de grupos en memoria, para los tests de casos de uso.
import type {
  ConsultasDeGrupos,
  DatosDeGrupo,
  GeneradorDeLinks,
  RepositorioDeGrupos,
} from '../../src/modules/grupos/application/puertos.ts';
import type { Membresia } from '../../src/modules/grupos/domain/politicas.ts';

interface GrupoEnMemoria {
  id: string;
  nombre: string;
  linkToken: string;
  creadorUsuarioId: string;
}

interface FilaDeMiembro {
  rol: 'jugador' | 'admin';
  salida: 'salio' | 'expulsado' | null;
}

export function gruposEnMemoria() {
  const grupos = new Map<string, GrupoEnMemoria>();
  /** clave: `${grupoId}/${usuarioId}` */
  const miembros = new Map<string, FilaDeMiembro>();
  let siguienteId = 0;
  let siguienteToken = 0;
  /** Se llama entre la lectura de la membresía y la escritura, para simular carreras. */
  let antesDeUnir: () => void = () => undefined;

  const clave = (grupoId: string, usuarioId: string) => `${grupoId}/${usuarioId}`;
  const vigentes = (grupoId: string) =>
    [...miembros.entries()].filter(([k, f]) => k.startsWith(`${grupoId}/`) && f.salida === null)
      .length;
  const datos = (g: GrupoEnMemoria | undefined): DatosDeGrupo | null =>
    g === undefined
      ? null
      : { id: g.id, nombre: g.nombre, linkToken: g.linkToken, cantidadMiembros: vigentes(g.id) };

  const repositorio: RepositorioDeGrupos = {
    membresia(grupoId, usuarioId): Promise<Membresia> {
      const fila = miembros.get(clave(grupoId, usuarioId));
      if (fila === undefined) {
        return Promise.resolve(null);
      }
      return Promise.resolve(
        fila.salida === null
          ? { rol: fila.rol, salida: null }
          : { rol: fila.rol, salida: fila.salida },
      );
    },
    crear(grupo) {
      siguienteId += 1;
      const id = `grupo-${String(siguienteId)}`;
      grupos.set(id, { id, ...grupo });
      miembros.set(clave(id, grupo.creadorUsuarioId), { rol: 'admin', salida: null });
      return Promise.resolve(id);
    },
    grupoDelLink(linkToken) {
      return Promise.resolve(
        [...grupos.values()].find((g) => g.linkToken === linkToken)?.id ?? null,
      );
    },
    unir(grupoId, usuarioId) {
      antesDeUnir();
      const fila = miembros.get(clave(grupoId, usuarioId));
      if (fila?.salida === 'expulsado') {
        return Promise.resolve('expulsado');
      }
      if (fila?.salida === null) {
        return Promise.resolve('ya_era_miembro');
      }
      miembros.set(clave(grupoId, usuarioId), { rol: 'jugador', salida: null });
      return Promise.resolve('unido');
    },
    cambiarLink(grupoId, linkToken) {
      const grupo = grupos.get(grupoId);
      if (grupo !== undefined) {
        grupo.linkToken = linkToken;
      }
      return Promise.resolve();
    },
  };

  const consultas: ConsultasDeGrupos = {
    grupo: (id) => Promise.resolve(datos(grupos.get(id))),
    grupoDelLink: (token) =>
      Promise.resolve(datos([...grupos.values()].find((g) => g.linkToken === token))),
    gruposDe: (usuarioId) =>
      Promise.resolve(
        [...grupos.values()].flatMap((g) => {
          const fila = miembros.get(clave(g.id, usuarioId));
          const rol = fila?.salida === null ? fila.rol : null;
          return rol === null
            ? []
            : [{ id: g.id, nombre: g.nombre, cantidadMiembros: vigentes(g.id), rol }];
        }),
      ),
  };

  const links: GeneradorDeLinks = {
    nuevoToken: () => {
      siguienteToken += 1;
      return `token-${String(siguienteToken)}`;
    },
  };

  return {
    repositorio,
    consultas,
    links,
    grupos,
    /** Pone a alguien en un grupo con un estado dado, sin pasar por los casos de uso. */
    poner(grupoId: string, usuarioId: string, fila: FilaDeMiembro) {
      miembros.set(clave(grupoId, usuarioId), fila);
    },
    fila: (grupoId: string, usuarioId: string) => miembros.get(clave(grupoId, usuarioId)),
    alUnir(accion: () => void) {
      antesDeUnir = accion;
    },
  };
}
