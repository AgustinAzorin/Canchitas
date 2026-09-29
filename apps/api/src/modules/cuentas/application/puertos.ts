// Puertos del módulo de cuentas. La identidad (contraseñas, sesiones, tokens de los mails) la
// resuelve Better Auth detrás de ProveedorDeIdentidad (ADR 0009); este módulo agrega las reglas
// del SRS que Better Auth no cubre: edad, nombre de usuario, privacidad, bloqueo y enlaces de un uso.
import type { IntentosDeInicio } from '../domain/bloqueo.ts';

export interface DatosDeAlta {
  email: string;
  contrasena: string;
  nombreUsuario: string;
  /** AAAA-MM-DD */
  fechaNacimiento: string;
  privacidadAceptadaEn: Date;
}

/**
 * Sesión recién creada. `token` es el bearer de Android (RNF-012); `cookies` son los
 * `Set-Cookie` que la web recibe tal cual (HttpOnly, Secure, SameSite=Lax).
 */
export interface SesionIniciada {
  usuarioId: string;
  token: string;
  cookies: readonly string[];
}

export interface SesionActual {
  usuarioId: string;
  /** `Set-Cookie` con el vencimiento corrido, cuando la sesión se refrescó (web). */
  cookies: readonly string[];
}

export interface ProveedorDeIdentidad {
  /** Crea la cuenta sin verificar y manda el mail de verificación. `false` si no se pudo crear. */
  crearCuenta(datos: DatosDeAlta): Promise<boolean>;
  /** `null` si el mail o la contraseña no coinciden, sin decir cuál. */
  iniciarSesion(email: string, contrasena: string): Promise<SesionIniciada | null>;
  /** Encabezados de la solicitud: cookie de la web o `Authorization: Bearer` de Android. */
  sesionActual(encabezados: Headers): Promise<SesionActual | null>;
  /** Borra la sesión y devuelve los `Set-Cookie` que la vencen en la web. */
  cerrarSesion(encabezados: Headers): Promise<readonly string[]>;
  /** Mail que dice el enlace de verificación, sin validar su firma. `null` si no se puede leer. */
  emailDelEnlaceDeVerificacion(token: string): string | null;
  /** Marca el mail como verificado. `false` si el enlace venció o no es válido. */
  verificarMail(token: string): Promise<boolean>;
  reenviarVerificacion(email: string): Promise<void>;
  pedirRecuperacion(email: string): Promise<void>;
  /** `false` si el enlace venció, no existe o ya se usó (RNF-014). */
  restablecerContrasena(token: string, contrasenaNueva: string): Promise<boolean>;
}

export interface Cuenta {
  id: string;
  email: string;
  nombreUsuario: string;
  estado: 'sin_verificar' | 'activa';
}

export interface RepositorioDeCuentas {
  existeEmail(email: string): Promise<boolean>;
  existeNombreDeUsuario(nombreUsuario: string): Promise<boolean>;
  buscar(id: string): Promise<Cuenta | null>;
  buscarPorEmail(email: string): Promise<Cuenta | null>;
}

export interface RepositorioDeIntentos {
  leer(email: string): Promise<IntentosDeInicio>;
  /** Aplica `cambio` sobre el estado guardado de forma atómica y devuelve el resultado. */
  actualizar(
    email: string,
    cambio: (intentos: IntentosDeInicio) => IntentosDeInicio,
  ): Promise<IntentosDeInicio>;
  reiniciar(email: string): Promise<void>;
}

/** Mails transaccionales (RI-011: solo verificación y recuperación). */
export interface EnviadorDeMails {
  enviarVerificacion(destino: string, enlace: string): Promise<void>;
  enviarRecuperacion(destino: string, enlace: string): Promise<void>;
}
