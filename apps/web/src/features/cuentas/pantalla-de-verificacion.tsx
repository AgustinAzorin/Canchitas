'use client';

import { useEffect, useRef, useState } from 'react';

import { mensajes } from '@/messages/es-AR';

import { detalleDeError, useReenviarVerificacion, useVerificarEmail } from './consultas';
import { FormularioDeReenvio } from './formulario-de-reenvio';
import { Marco } from './marco';
import { useTokenDelFragmento } from './textos';
import { validarEmail } from './validacion';
import { Verificacion, type EstadoDeVerificacion } from './verificacion';

export function PantallaDeVerificacion() {
  const verificar = useVerificarEmail();
  const reenviar = useReenviarVerificacion();
  const [errorDeEmail, setErrorDeEmail] = useState<string>();
  const token = useTokenDelFragmento();
  const usado = useRef<string>(null);
  const { mutate } = verificar;

  useEffect(() => {
    // El enlace se usa una sola vez (RNF-014): React en modo estricto corre el efecto dos veces.
    if (typeof token === 'string' && usado.current !== token) {
      usado.current = token;
      mutate(token);
    }
  }, [token, mutate]);

  const estado: EstadoDeVerificacion =
    token === null
      ? { tipo: 'error', error: { tipo: 'api', codigo: 'enlace-invalido' } }
      : verificar.isSuccess
        ? { tipo: 'activa' }
        : verificar.isError
          ? { tipo: 'error', error: detalleDeError(verificar.error) }
          : { tipo: 'verificando' };

  return (
    <Marco titulo={mensajes.cuentas.verificacion.titulo}>
      <Verificacion estado={estado} />
      {estado.tipo === 'error' && (
        <FormularioDeReenvio
          estado={reenviar.isPending ? 'enviando' : reenviar.isSuccess ? 'enviado' : 'inicial'}
          error={errorDeEmail}
          onEnviar={(email) => {
            const error = validarEmail(email);
            setErrorDeEmail(error);
            if (error === undefined) reenviar.mutate(email);
          }}
        />
      )}
    </Marco>
  );
}
