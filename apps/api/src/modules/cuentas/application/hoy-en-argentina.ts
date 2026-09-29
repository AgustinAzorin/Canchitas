// La fecha de hoy en la zona de la app (CLAUDE.md: se muestra en America/Argentina/Buenos_Aires).
import type { FechaCalendario } from '../domain/fecha-calendario.ts';

const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function fechaEnArgentina(instante: Date): FechaCalendario {
  const partes = Object.fromEntries(formato.formatToParts(instante).map((p) => [p.type, p.value]));
  return { anio: Number(partes['year']), mes: Number(partes['month']), dia: Number(partes['day']) };
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}
