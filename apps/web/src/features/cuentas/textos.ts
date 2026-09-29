'use client';

// Del error de la API o de la red al texto de es-AR.ts (ADR 0008: se decide por `type`).
import { useSyncExternalStore } from 'react';

import { mensajes } from '@/messages/es-AR';

import type { ErrorDeCuentas } from './consultas';

const errores: Readonly<Record<string, string>> = mensajes.cuentas.errores;

export function textoDeError(error: ErrorDeCuentas): string {
  if (error.tipo === 'sin-conexion') {
    return mensajes.comun.sinConexion;
  }
  return error.tipo === 'api'
    ? (errores[error.codigo] ?? mensajes.comun.errorInesperado)
    : mensajes.comun.errorInesperado;
}

/** Lee el token del fragmento del enlace (#token=…): no viaja al servidor ni queda en logs. */
export function tokenDelFragmento(fragmento: string): string | null {
  const token = new URLSearchParams(fragmento.replace(/^#/, '')).get('token');
  return token === null || token === '' ? null : token;
}

function suscribirAlFragmento(avisar: () => void): () => void {
  window.addEventListener('hashchange', avisar);
  return () => {
    window.removeEventListener('hashchange', avisar);
  };
}

/** Token del fragmento de la URL actual. `undefined` en el servidor, `null` si no hay. */
export function useTokenDelFragmento(): string | null | undefined {
  return useSyncExternalStore(
    suscribirAlFragmento,
    () => tokenDelFragmento(window.location.hash),
    () => undefined,
  );
}
