// Catálogo de errores de /v1/cuentas como problem+json (ADR 0008). El `type` es estable: los
// clientes eligen el texto a mostrar según él.
import type { Problem } from '../../../shared/http/problem.ts';

const base = 'https://canchitas.app/errores/';

export const problemasDeCuentas = {
  privacidadNoAceptada: {
    type: `${base}privacidad-no-aceptada`,
    title: 'Hay que aceptar la política de privacidad',
    status: 422,
    requisito: 'RNF-018',
  },
  nombreDeUsuarioInvalido: {
    type: `${base}nombre-de-usuario-invalido`,
    title: 'El nombre de usuario no tiene un formato válido',
    status: 422,
    requisito: 'RF-003',
  },
  fechaInvalida: {
    type: `${base}fecha-invalida`,
    title: 'La fecha de nacimiento no existe',
    status: 422,
    requisito: 'RF-002',
  },
  menorDeEdad: {
    type: `${base}menor-de-edad`,
    title: 'Hay que tener 18 años o más para registrarse',
    status: 422,
    requisito: 'RF-002',
  },
  emailEnUso: {
    type: `${base}email-en-uso`,
    title: 'El mail ya está en uso',
    status: 409,
    requisito: 'RF-001',
  },
  nombreDeUsuarioEnUso: {
    type: `${base}nombre-de-usuario-en-uso`,
    title: 'El nombre de usuario ya está en uso',
    status: 409,
    requisito: 'RF-003',
  },
  credencialesInvalidas: {
    type: `${base}credenciales-invalidas`,
    title: 'El mail o la contraseña no son correctos',
    status: 401,
    requisito: 'RF-005',
  },
  cuentaBloqueada: {
    type: `${base}cuenta-bloqueada`,
    title: 'Demasiados intentos fallidos: el inicio de sesión está bloqueado por 15 minutos',
    status: 429,
    requisito: 'RNF-011',
  },
  sinSesion: {
    type: `${base}sin-sesion`,
    title: 'No hay una sesión iniciada',
    status: 401,
  },
  enlaceInvalido: {
    type: `${base}enlace-invalido`,
    title: 'El enlace venció o no es válido',
    status: 400,
  },
  enlaceUsado: {
    type: `${base}enlace-usado`,
    title: 'El enlace ya se usó',
    status: 410,
    requisito: 'RNF-014',
  },
} as const satisfies Record<string, Problem>;
