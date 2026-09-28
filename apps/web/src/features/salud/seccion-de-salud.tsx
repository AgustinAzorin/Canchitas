'use client';

import { useEstadoDeLaApi } from './consultas';
import { EstadoDeLaApi } from './estado-de-la-api';

export function SeccionDeSalud() {
  const { data } = useEstadoDeLaApi();
  return <EstadoDeLaApi estado={data} />;
}
