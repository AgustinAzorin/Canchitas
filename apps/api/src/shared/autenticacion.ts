// Quién hace la solicitud. Lo resuelve el módulo de cuentas (ADR 0009) y la raíz de composición
// se lo pasa a las rutas que necesitan sesión. Qué puede hacer cada uno no se decide acá: eso es
// del módulo de políticas (modules/grupos/domain/politicas.ts).

export interface Actor {
  usuarioId: string;
  cuenta: 'sin_verificar' | 'activa';
}

export interface SesionAutenticada {
  actor: Actor;
  /** `Set-Cookie` de la sesión refrescada en la web (RNF-012). */
  cookies: readonly string[];
}

/** Encabezados de la solicitud (cookie o bearer); `null` si no hay sesión. */
export type Autenticar = (encabezados: Headers) => Promise<SesionAutenticada | null>;
