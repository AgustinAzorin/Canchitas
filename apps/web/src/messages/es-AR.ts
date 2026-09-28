// Todos los textos visibles de la web (ADR 0002). Voseo, sin exclamaciones ni emojis.
export const mensajes = {
  app: {
    nombre: 'Canchitas',
    descripcion: 'Organizá los partidos con tu grupo y encontrá canchas.',
  },
  salud: {
    titulo: 'Estado del servicio',
    consultando: 'Consultando la API…',
    enLinea: 'La API está en línea.',
    version: 'Versión',
    horaDelServidor: 'Hora del servidor',
    baseCaida: 'La API responde, pero la base de datos no. Probá de nuevo en unos minutos.',
    sinConexion: 'No pudimos conectarnos con la API. Revisá tu conexión y probá de nuevo.',
  },
} as const;
