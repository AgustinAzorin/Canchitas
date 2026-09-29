// Llama a la API con el cliente generado y convierte la respuesta de error en algo que la
// pantalla sabe mostrar: el sufijo del `type` del problem+json (ADR 0008) o la falta de red.

/** Error que la pantalla muestra. */
export type ErrorDeApi =
  { tipo: 'api'; codigo: string } | { tipo: 'sin-conexion' } | { tipo: 'inesperado' };

const baseDeTipos = 'https://canchitas.app/errores/';

export class FallaDeApi extends Error {
  constructor(readonly detalle: ErrorDeApi) {
    super(detalle.tipo);
  }
}

export function detalleDeError(error: unknown): ErrorDeApi {
  return error instanceof FallaDeApi ? error.detalle : { tipo: 'inesperado' };
}

export function esError(error: unknown, codigo: string): boolean {
  const detalle = detalleDeError(error);
  return detalle.tipo === 'api' && detalle.codigo === codigo;
}

export async function llamar<T>(
  pedido: () => Promise<{ data?: T; error?: { type: string }; response: Response }>,
): Promise<T | undefined> {
  let resultado;
  try {
    resultado = await pedido();
  } catch {
    throw new FallaDeApi({ tipo: 'sin-conexion' });
  }
  if (resultado.error !== undefined) {
    const { type } = resultado.error;
    throw new FallaDeApi(
      type.startsWith(baseDeTipos)
        ? { tipo: 'api', codigo: type.slice(baseDeTipos.length) }
        : { tipo: 'inesperado' },
    );
  }
  if (!resultado.response.ok) {
    throw new FallaDeApi({ tipo: 'inesperado' });
  }
  return resultado.data;
}

/** Para las mutaciones que siempre devuelven cuerpo. */
export async function llamarConDatos<T>(
  pedido: () => Promise<{ data?: T; error?: { type: string }; response: Response }>,
): Promise<T> {
  const datos = await llamar(pedido);
  if (datos === undefined) {
    throw new FallaDeApi({ tipo: 'inesperado' });
  }
  return datos;
}
