// RN-20 y RF-002: solo se registran personas de 18 años o más, contando en hora argentina.
import { diasDelMes, compararFechas, type FechaCalendario } from './fecha-calendario.ts';

export const edadMinima = 18;

export interface MenorDeEdad {
  tipo: 'MenorDeEdad';
  edadMinima: number;
}

/**
 * Última fecha de nacimiento que cumple la edad mínima hoy. Igual que `fecha - interval '18 years'`
 * de Postgres (el CHECK `mayor_de_edad` de `usuario`): si el día no existe ese año (29 de febrero),
 * se usa el último día del mes. Quien nació un 29 de febrero cumple el 1 de marzo en años no bisiestos.
 */
function nacimientoLimite(hoy: FechaCalendario): FechaCalendario {
  const anio = hoy.anio - edadMinima;
  return { anio, mes: hoy.mes, dia: Math.min(hoy.dia, diasDelMes(anio, hoy.mes)) };
}

export function cumpleEdadMinima(nacimiento: FechaCalendario, hoy: FechaCalendario): boolean {
  return compararFechas(nacimiento, nacimientoLimite(hoy)) <= 0;
}
