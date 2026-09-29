// RNF-011: 5 intentos fallidos consecutivos de inicio de sesión bloquean 15 minutos.
// El conteo es por mail, exista o no la cuenta, para no revelar cuáles existen (RF-005).
// Los intentos durante el bloqueo no lo alargan, y un inicio correcto reinicia el conteo.

export const intentosAntesDelBloqueo = 5;
export const duracionDelBloqueoMs = 15 * 60 * 1000;

export interface IntentosDeInicio {
  fallidosConsecutivos: number;
  bloqueadoHasta: Date | null;
}

export interface CuentaBloqueada {
  tipo: 'CuentaBloqueada';
  hasta: Date;
}

export const sinIntentos: IntentosDeInicio = { fallidosConsecutivos: 0, bloqueadoHasta: null };

/** Fin del bloqueo si está vigente en `ahora`. */
export function bloqueoVigente(intentos: IntentosDeInicio, ahora: Date): Date | null {
  const hasta = intentos.bloqueadoHasta;
  return hasta !== null && ahora.getTime() < hasta.getTime() ? hasta : null;
}

export function registrarFallo(intentos: IntentosDeInicio, ahora: Date): IntentosDeInicio {
  if (bloqueoVigente(intentos, ahora) !== null) {
    return intentos;
  }
  // Un bloqueo vencido no cuenta: se arranca de cero.
  const previos = intentos.bloqueadoHasta === null ? intentos.fallidosConsecutivos : 0;
  const fallidosConsecutivos = previos + 1;
  if (fallidosConsecutivos >= intentosAntesDelBloqueo) {
    return {
      fallidosConsecutivos,
      bloqueadoHasta: new Date(ahora.getTime() + duracionDelBloqueoMs),
    };
  }
  return { fallidosConsecutivos, bloqueadoHasta: null };
}
