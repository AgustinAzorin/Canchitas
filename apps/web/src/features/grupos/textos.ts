// Del error de la API o de la red al texto de es-AR.ts (ADR 0008: se decide por `type`).
import type { ErrorDeApi } from '@/lib/api/llamar';
import { mensajes } from '@/messages/es-AR';

const errores: Readonly<Record<string, string>> = mensajes.grupos.errores;

export function textoDeError(error: ErrorDeApi): string {
  if (error.tipo === 'sin-conexion') {
    return mensajes.comun.sinConexion;
  }
  return error.tipo === 'api'
    ? (errores[error.codigo] ?? mensajes.comun.errorInesperado)
    : mensajes.comun.errorInesperado;
}

export function textoDeRol(rol: 'admin' | 'jugador'): string {
  return mensajes.grupos.roles[rol];
}
