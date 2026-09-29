'use client';

import { useState } from 'react';

import { mensajes } from '@/messages/es-AR';

import { detalleDeError, useRestablecerContrasena } from './consultas';
import {
  FormularioDeContrasenaNueva,
  type EstadoDeContrasenaNueva,
} from './formulario-de-contrasena-nueva';
import { Marco } from './marco';
import { useTokenDelFragmento } from './textos';
import { validarContrasenaNueva } from './validacion';

export function PantallaDeContrasenaNueva() {
  const restablecer = useRestablecerContrasena();
  // undefined: todavía no se leyó el fragmento; null: el enlace no trae token.
  const token = useTokenDelFragmento();
  const [errorDeCampo, setErrorDeCampo] = useState<string>();

  const estado: EstadoDeContrasenaNueva =
    token === null
      ? { tipo: 'error', error: { tipo: 'api', codigo: 'enlace-invalido' } }
      : restablecer.isSuccess
        ? { tipo: 'lista' }
        : restablecer.isError
          ? { tipo: 'error', error: detalleDeError(restablecer.error) }
          : { tipo: 'editando', enviando: restablecer.isPending, errorDeCampo };

  return (
    <Marco titulo={mensajes.cuentas.recuperacion.nuevaTitulo}>
      <FormularioDeContrasenaNueva
        estado={estado}
        onEnviar={(contrasenaNueva) => {
          const error = validarContrasenaNueva(contrasenaNueva);
          setErrorDeCampo(error);
          if (error === undefined && typeof token === 'string') {
            restablecer.mutate({ token, contrasenaNueva });
          }
        }}
      />
    </Marco>
  );
}
