// RF-001: largo de la contraseña. El SRS no fija reglas de complejidad; se decidió 8 a 128
// caracteres, sin más requisitos (PR de M1, cuentas).
export const largoDeContrasena = { minimo: 8, maximo: 128 } as const;
