// Una fecha sin hora ni zona (fecha de nacimiento, "hoy" en Argentina).
import { err, ok, type Result } from '../../../shared/result.ts';

export interface FechaCalendario {
  anio: number;
  /** 1 a 12 */
  mes: number;
  dia: number;
}

export interface FechaInvalida {
  tipo: 'FechaInvalida';
}

export function diasDelMes(anio: number, mes: number): number {
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const dias = [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return dias[mes - 1] ?? 0;
}

/** Lee una fecha `AAAA-MM-DD` y rechaza las que no existen (31 de abril, 29 de febrero no bisiesto). */
export function leerFechaCalendario(texto: string): Result<FechaCalendario, FechaInvalida> {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (partes === null) {
    return err({ tipo: 'FechaInvalida' });
  }
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  if (mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) {
    return err({ tipo: 'FechaInvalida' });
  }
  return ok({ anio, mes, dia });
}

export function compararFechas(a: FechaCalendario, b: FechaCalendario): number {
  return a.anio - b.anio || a.mes - b.mes || a.dia - b.dia;
}
