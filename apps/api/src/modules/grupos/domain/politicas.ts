// Módulo de políticas de autorización (ADR 0004, ADR 0009, RNF-013): la matriz rol × acción de
// un grupo. Es la única fuente de permisos de la API. Los casos de uso le preguntan acá antes de
// tocar nada y los handlers HTTP no chequean roles. La matriz completa se prueba celda por celda
// en test/grupos/politicas.test.ts.
//
// De dónde sale cada fila:
// - RF-010: crear un grupo requiere una cuenta activa.
// - RF-011, RF-004 y RN-28: unirse por link requiere una cuenta activa. El expulsado no vuelve.
//   Al que ya es miembro se lo lleva al grupo sin duplicar la membresía, así que no se le niega.
// - RN-27: la vista previa del link se muestra a quien tiene sesión, verificada o no.
// - RF-012 y RN-26: ver y regenerar el link son acciones de admin.
// - RN-07: crear votaciones y partidos, armar equipos, cargar resultados, registrar costos y
//   marcar pagos son acciones de admin.
// - Ver el grupo es de sus miembros.
import { err, ok, type Result } from '../../../shared/result.ts';

/** Relación de quien actúa con el grupo, derivada de su cuenta y su fila en `miembro`. */
export const roles = [
  'cuenta_sin_verificar',
  'no_miembro',
  'ex_miembro',
  'expulsado',
  'jugador',
  'admin',
] as const;
export type Rol = (typeof roles)[number];

export const acciones = [
  'crear_grupo',
  'ver_invitacion',
  'unirse_por_link',
  'ver_grupo',
  'ver_link',
  'regenerar_link',
  'crear_votacion',
  'crear_partido',
  'armar_equipos',
  'cargar_resultado',
  'registrar_costo',
  'marcar_pago',
] as const;
export type Accion = (typeof acciones)[number];

/** Por qué se niega una acción. Cada motivo tiene su problem+json. */
export type MotivoDeRechazo = 'CuentaSinVerificar' | 'NoEsMiembro' | 'NoEsAdmin' | 'Expulsado';

export type Decision = { permitida: true } | { permitida: false; motivo: MotivoDeRechazo };

export interface NoAutorizado {
  tipo: 'NoAutorizado';
  motivo: MotivoDeRechazo;
}

export type EstadoDeCuenta = 'sin_verificar' | 'activa';

/** Membresía tal como está guardada; `null` si nunca fue miembro. */
export type Membresia =
  | { rol: 'jugador' | 'admin'; salida: null }
  | { rol: 'jugador' | 'admin'; salida: 'salio' | 'expulsado' }
  | null;

export function rolDelActor(cuenta: EstadoDeCuenta, membresia: Membresia): Rol {
  if (cuenta === 'sin_verificar') {
    return 'cuenta_sin_verificar';
  }
  if (membresia === null) {
    return 'no_miembro';
  }
  if (membresia.salida === 'salio') {
    return 'ex_miembro';
  }
  if (membresia.salida === 'expulsado') {
    return 'expulsado';
  }
  return membresia.rol;
}

const permitida: Decision = { permitida: true };
const negada = (motivo: MotivoDeRechazo): Decision => ({ permitida: false, motivo });

const sinVerificar = negada('CuentaSinVerificar');
const noEsMiembro = negada('NoEsMiembro');
const noEsAdmin = negada('NoEsAdmin');

/** Acción de miembros: los de afuera reciben "no es miembro", sin saber más del grupo. */
const deMiembros: Record<Rol, Decision> = {
  cuenta_sin_verificar: noEsMiembro,
  no_miembro: noEsMiembro,
  ex_miembro: noEsMiembro,
  expulsado: noEsMiembro,
  jugador: permitida,
  admin: permitida,
};

/** Acción de admins (RN-07, RN-26, RF-012). */
const deAdmins: Record<Rol, Decision> = { ...deMiembros, jugador: noEsAdmin };

export const matriz: Readonly<Record<Accion, Readonly<Record<Rol, Decision>>>> = {
  crear_grupo: {
    cuenta_sin_verificar: sinVerificar,
    no_miembro: permitida,
    ex_miembro: permitida,
    expulsado: permitida,
    jugador: permitida,
    admin: permitida,
  },
  ver_invitacion: {
    cuenta_sin_verificar: permitida,
    no_miembro: permitida,
    ex_miembro: permitida,
    expulsado: permitida,
    jugador: permitida,
    admin: permitida,
  },
  unirse_por_link: {
    cuenta_sin_verificar: sinVerificar,
    no_miembro: permitida,
    ex_miembro: permitida,
    expulsado: negada('Expulsado'),
    jugador: permitida,
    admin: permitida,
  },
  ver_grupo: deMiembros,
  ver_link: deAdmins,
  regenerar_link: deAdmins,
  crear_votacion: deAdmins,
  crear_partido: deAdmins,
  armar_equipos: deAdmins,
  cargar_resultado: deAdmins,
  registrar_costo: deAdmins,
  marcar_pago: deAdmins,
};

export function decidir(accion: Accion, rol: Rol): Decision {
  return matriz[accion][rol];
}

/** Acciones que un rol puede hacer, para que los clientes muestren solo esas (RN-07). */
export function accionesPermitidas(rol: Rol): readonly Accion[] {
  return acciones.filter((accion) => decidir(accion, rol).permitida);
}

/** Paso 1 de todo caso de uso (apps/api/CLAUDE.md): autorizar antes de cargar o escribir. */
export function autorizar(accion: Accion, rol: Rol): Result<Rol, NoAutorizado> {
  const decision = decidir(accion, rol);
  return decision.permitida ? ok(rol) : err({ tipo: 'NoAutorizado', motivo: decision.motivo });
}
