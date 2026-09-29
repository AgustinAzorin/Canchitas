// Validación de formularios solo para la experiencia: la API vuelve a validar y decide
// (CLAUDE.md: la web no tiene reglas de negocio). Se valida al enviar, no mientras se tipea.
import { mensajes } from '@/messages/es-AR';

const v = mensajes.cuentas.validacion;
const obligatorio = mensajes.comun.campoObligatorio;

export type Errores<K extends string> = Partial<Record<K, string>>;

export function validarEmail(email: string): string | undefined {
  if (email.trim() === '') return obligatorio;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : v.email;
}

export function validarContrasenaNueva(contrasena: string): string | undefined {
  if (contrasena === '') return obligatorio;
  if (contrasena.length < 8) return v.contrasenaCorta;
  return contrasena.length > 128 ? v.contrasenaLarga : undefined;
}

export function validarRegistro(datos: {
  email: string;
  contrasena: string;
  nombreUsuario: string;
  fechaNacimiento: string;
  aceptaPrivacidad: boolean;
}): Errores<keyof typeof datos> {
  const errores: Errores<keyof typeof datos> = {};
  const email = validarEmail(datos.email);
  if (email !== undefined) errores.email = email;
  const contrasena = validarContrasenaNueva(datos.contrasena);
  if (contrasena !== undefined) errores.contrasena = contrasena;
  if (datos.nombreUsuario.trim() === '') errores.nombreUsuario = obligatorio;
  else if (!/^[a-zA-Z0-9_.]{3,20}$/.test(datos.nombreUsuario.trim()))
    errores.nombreUsuario = v.nombreUsuario;
  if (datos.fechaNacimiento === '') errores.fechaNacimiento = obligatorio;
  if (!datos.aceptaPrivacidad) errores.aceptaPrivacidad = v.privacidad;
  return errores;
}
