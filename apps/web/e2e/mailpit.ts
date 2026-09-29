// Lee los mails que la API mandó a Mailpit (ADR 0019).
import { expect } from '@playwright/test';

const base = process.env['MAILPIT_URL'] ?? 'http://localhost:8025';

async function leerJson(url: string): Promise<unknown> {
  const respuesta = await fetch(url);
  return respuesta.json();
}

function campo(objeto: unknown, nombre: string): unknown {
  return typeof objeto === 'object' && objeto !== null ? Reflect.get(objeto, nombre) : undefined;
}

/** Espera el último mail a `destino` con ese asunto y devuelve el enlace que trae. */
export async function enlaceDelMail(destino: string, asunto: string): Promise<string> {
  let enlace = '';
  await expect
    .poll(
      async () => {
        const query = encodeURIComponent(`to:"${destino}" subject:"${asunto}"`);
        const mensajes = campo(await leerJson(`${base}/api/v1/search?query=${query}`), 'messages');
        const id = Array.isArray(mensajes) ? campo(mensajes[0], 'ID') : undefined;
        if (typeof id !== 'string') return false;
        const texto = campo(await leerJson(`${base}/api/v1/message/${id}`), 'Text');
        enlace =
          typeof texto === 'string' ? (/https?:\/\/\S+#token=\S+/.exec(texto)?.[0] ?? '') : '';
        return enlace !== '';
      },
      { timeout: 10_000 },
    )
    .toBe(true);
  return enlace;
}
