'use client';

import { useState } from 'react';

import { mensajes } from '@/messages/es-AR';

import { usePedirRecuperacion } from './consultas';
import { FormularioDeRecuperacion } from './formulario-de-recuperacion';
import { Marco } from './marco';
import { validarEmail } from './validacion';

export function PantallaDeRecuperacion() {
  const pedir = usePedirRecuperacion();
  const [error, setError] = useState<string>();

  return (
    <Marco titulo={mensajes.cuentas.recuperacion.titulo}>
      <FormularioDeRecuperacion
        estado={pedir.isPending ? 'enviando' : pedir.isSuccess ? 'enviado' : 'inicial'}
        error={error ?? (pedir.isError ? mensajes.comun.sinConexion : undefined)}
        onEnviar={(email) => {
          const local = validarEmail(email);
          setError(local);
          if (local === undefined) pedir.mutate(email);
        }}
      />
    </Marco>
  );
}
