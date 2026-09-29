// Esquemas de /v1/cuentas (ADR 0007). La validación de formato es la primera barrera; las
// reglas del SRS (edad, nombre de usuario, privacidad) las decide el caso de uso.
import { z } from 'zod';

import { largoDeContrasena } from '../application/reglas.ts';

const Email = z.email().max(254).describe('Mail de la cuenta');
const Contrasena = z.string().min(largoDeContrasena.minimo).max(largoDeContrasena.maximo);

export const SolicitudDeAlta = z
  .object({
    email: Email,
    contrasena: Contrasena.describe(
      `Entre ${String(largoDeContrasena.minimo)} y ${String(largoDeContrasena.maximo)} caracteres`,
    ),
    nombreUsuario: z
      .string()
      .max(40)
      .describe(
        '3 a 20 letras minúsculas, números, punto o guion bajo (RF-003). Se guarda en minúsculas.',
      ),
    fechaNacimiento: z.iso.date().describe('AAAA-MM-DD (RF-002)'),
    aceptaPrivacidad: z.boolean().describe('Aceptación de la política de privacidad (RNF-018)'),
  })
  .meta({ id: 'SolicitudDeAlta' });

export const EstadoDeCuenta = z.enum(['sin_verificar', 'activa']).meta({ id: 'EstadoDeCuenta' });

export const Cuenta = z
  .object({
    id: z.uuid(),
    email: z.string(),
    nombreUsuario: z.string(),
    estado: EstadoDeCuenta,
  })
  .meta({ id: 'Cuenta' });

export const CuentaCreada = z
  .object({
    email: z.string(),
    nombreUsuario: z.string(),
    estado: z.literal('sin_verificar'),
  })
  .meta({ id: 'CuentaCreada' });

export const SolicitudDeInicio = z
  .object({ email: Email, contrasena: z.string().min(1).max(largoDeContrasena.maximo) })
  .meta({ id: 'SolicitudDeInicio' });

export const SesionConToken = z
  .object({
    token: z
      .string()
      .describe('Bearer para `Authorization`. Vence a los 30 días sin uso (RNF-012).'),
    cuenta: Cuenta,
  })
  .meta({ id: 'SesionConToken' });

export const SolicitudConEmail = z.object({ email: Email }).meta({ id: 'SolicitudConEmail' });

export const SolicitudDeVerificacion = z
  .object({ token: z.string().min(1).max(4096).describe('Token del enlace del mail') })
  .meta({ id: 'SolicitudDeVerificacion' });

export const SolicitudDeRestablecimiento = z
  .object({
    token: z.string().min(1).max(4096).describe('Token del enlace del mail'),
    contrasenaNueva: Contrasena,
  })
  .meta({ id: 'SolicitudDeRestablecimiento' });
