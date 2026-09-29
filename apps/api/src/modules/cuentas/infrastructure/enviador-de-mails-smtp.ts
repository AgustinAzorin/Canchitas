// Mails por SMTP con Nodemailer (ADR 0009). El proveedor está abierto (TBD-09): se configura
// por variables de entorno. En dev y en los E2E apunta a Mailpit (ADR 0019).
import { createTransport } from 'nodemailer';

import type { EnviadorDeMails } from '../application/puertos.ts';
import { textosDeMails, type TextoDeMail } from './textos-de-mails.ts';

export interface OpcionesSmtp {
  host: string;
  puerto: number;
  /** TLS desde el inicio (465). Con `false` se usa STARTTLS si el servidor lo ofrece. */
  seguro: boolean;
  usuario?: string | undefined;
  contrasena?: string | undefined;
  remitente: string;
}

export function crearEnviadorDeMailsSmtp(o: OpcionesSmtp): EnviadorDeMails {
  const transporte = createTransport({
    host: o.host,
    port: o.puerto,
    secure: o.seguro,
    ...(o.usuario === undefined ? {} : { auth: { user: o.usuario, pass: o.contrasena ?? '' } }),
  });

  async function enviar(destino: string, mail: TextoDeMail, enlace: string): Promise<void> {
    await transporte.sendMail({
      from: o.remitente,
      to: destino,
      subject: mail.asunto,
      text: mail.texto(enlace),
    });
  }

  return {
    enviarVerificacion: (destino, enlace) => enviar(destino, textosDeMails.verificacion, enlace),
    enviarRecuperacion: (destino, enlace) => enviar(destino, textosDeMails.recuperacion, enlace),
  };
}
