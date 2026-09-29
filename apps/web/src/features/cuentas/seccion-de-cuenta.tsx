'use client';

import { useRouter } from 'next/navigation';

import { useCerrarSesion, useCuentaActual, useReenviarVerificacion } from './consultas';
import { CuentaActual } from './cuenta-actual';

export function SeccionDeCuenta() {
  const router = useRouter();
  const { data, isError } = useCuentaActual();
  const cerrar = useCerrarSesion();
  const reenviar = useReenviarVerificacion();

  return (
    <CuentaActual
      cuenta={isError ? null : data}
      cerrando={cerrar.isPending}
      reenvio={reenviar.isPending ? 'enviando' : reenviar.isSuccess ? 'enviado' : 'inicial'}
      onCerrarSesion={() => {
        cerrar.mutate(undefined, {
          onSettled: () => {
            router.push('/ingresar');
          },
        });
      }}
      onReenviar={() => {
        if (data !== undefined && data !== null) reenviar.mutate(data.email);
      }}
    />
  );
}
