// Vuelta al link de invitación después de iniciar sesión o registrarse (RF-011, RN-27). Solo se
// guarda el token en la URL: el destino es siempre /i/<token>, así que no hay redirección abierta.

export const parametroDeInvitacion = 'invitacion';

/** Destino después de iniciar sesión: el link de invitación, si venía de uno. */
export function destinoDespuesDeIngresar(invitacion: string | undefined): `/i/${string}` | '/' {
  return invitacion === undefined || invitacion === ''
    ? '/'
    : `/i/${encodeURIComponent(invitacion)}`;
}

export function hrefDeIngreso(invitacion: string | undefined): '/ingresar' | `/ingresar?${string}` {
  return invitacion === undefined || invitacion === ''
    ? '/ingresar'
    : `/ingresar?${parametroDeInvitacion}=${encodeURIComponent(invitacion)}`;
}

export function hrefDeRegistro(
  invitacion: string | undefined,
): '/registro' | `/registro?${string}` {
  return invitacion === undefined || invitacion === ''
    ? '/registro'
    : `/registro?${parametroDeInvitacion}=${encodeURIComponent(invitacion)}`;
}

/** Props de una página de Next que lee los `searchParams`. */
export interface ConParametros {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Lee el parámetro de los `searchParams` de una página. */
export function invitacionDe(
  parametros: Record<string, string | string[] | undefined>,
): string | undefined {
  const valor = parametros[parametroDeInvitacion];
  return typeof valor === 'string' && valor !== '' ? valor : undefined;
}
