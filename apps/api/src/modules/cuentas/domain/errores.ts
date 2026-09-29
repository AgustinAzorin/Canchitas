// Errores de dominio del módulo de cuentas (ADR 0008).
export type { CuentaBloqueada } from './bloqueo.ts';
export type { MenorDeEdad } from './edad.ts';
export type { FechaInvalida } from './fecha-calendario.ts';
export type { NombreDeUsuarioInvalido } from './nombre-de-usuario.ts';

/** RNF-018 */
export interface PrivacidadNoAceptada {
  tipo: 'PrivacidadNoAceptada';
}

/** RF-001 */
export interface EmailEnUso {
  tipo: 'EmailEnUso';
}

/** RF-003 */
export interface NombreDeUsuarioEnUso {
  tipo: 'NombreDeUsuarioEnUso';
}

/** RF-005: no dice si falló el mail o la contraseña. */
export interface CredencialesInvalidas {
  tipo: 'CredencialesInvalidas';
}

/** RF-004 y RF-006: el enlace venció o no existe. */
export interface EnlaceInvalido {
  tipo: 'EnlaceInvalido';
}

/** RNF-014: el enlace ya se usó. */
export interface EnlaceUsado {
  tipo: 'EnlaceUsado';
}

export interface SinSesion {
  tipo: 'SinSesion';
}
