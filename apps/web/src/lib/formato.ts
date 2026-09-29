// Formato de fechas y plata para toda la web: hora de Argentina y pesos sin decimales
// (RNF-025, RNF-026, apps/web/CLAUDE.md).
const zonaHoraria = 'America/Argentina/Buenos_Aires';

const fechaYHora = new Intl.DateTimeFormat('es-AR', {
  timeZone: zonaHoraria,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

/** "sáb 10/10 · 23:00" (GUIDELINES, tipografía). */
export function formatearFechaYHora(instante: Date): string {
  const partes = Object.fromEntries(
    fechaYHora.formatToParts(instante).map((parte) => [parte.type, parte.value]),
  );
  const dia = (partes['weekday'] ?? '').replace('.', '');
  return `${dia} ${partes['day'] ?? ''}/${partes['month'] ?? ''} · ${partes['hour'] ?? ''}:${partes['minute'] ?? ''}`;
}

export function formatearPesos(monto: number): string {
  return pesos.format(monto);
}
