// Textos de los mails de cuentas (RI-003: español rioplatense; GUIDELINES: voseo, sin
// exclamaciones ni emojis). RI-011: solo se mandan mails de verificación y de recuperación.
export interface TextoDeMail {
  asunto: string;
  texto(enlace: string): string;
}

export const textosDeMails = {
  verificacion: {
    asunto: 'Verificá tu mail en Canchitas',
    texto: (enlace) =>
      [
        'Hola.',
        '',
        'Para activar tu cuenta de Canchitas, abrí este enlace:',
        enlace,
        '',
        'El enlace vence en 24 horas y sirve una sola vez.',
        'Si no creaste una cuenta, ignorá este mail.',
      ].join('\n'),
  },
  recuperacion: {
    asunto: 'Definí una contraseña nueva para Canchitas',
    texto: (enlace) =>
      [
        'Hola.',
        '',
        'Para definir una contraseña nueva, abrí este enlace:',
        enlace,
        '',
        'El enlace vence en 1 hora y sirve una sola vez. Al cambiar la contraseña se cierran tus sesiones abiertas.',
        'Si no pediste el cambio, ignorá este mail: tu contraseña sigue igual.',
      ].join('\n'),
  },
} as const satisfies Record<string, TextoDeMail>;
