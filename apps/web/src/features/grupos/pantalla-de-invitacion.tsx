'use client';

// Entrada por link de invitación (RF-011). Sin sesión, se pide iniciar sesión o registrarse y
// se vuelve acá (RN-27). Si ya es miembro, se lo lleva al grupo.
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useCuentaActual, useReenviarVerificacion } from '@/features/cuentas/consultas';
import { detalleDeError } from '@/lib/api/llamar';
import { mensajes } from '@/messages/es-AR';

import { useInvitacion, useUnirse } from './consultas';
import { VistaDeInvitacion, type EstadoDeLaInvitacion } from './invitacion';

export function PantallaDeInvitacion({ token }: { token: string }) {
  const router = useRouter();
  const cuenta = useCuentaActual();
  const conSesion = cuenta.data !== undefined && cuenta.data !== null;
  const invitacion = useInvitacion(token, conSesion);
  const unirse = useUnirse(token);
  const reenviar = useReenviarVerificacion();

  const grupoDelMiembro =
    invitacion.data?.estado === 'ya_es_miembro' ? invitacion.data.grupoId : undefined;
  useEffect(() => {
    if (grupoDelMiembro !== undefined) {
      router.replace(`/grupos/${grupoDelMiembro}`);
    }
  }, [grupoDelMiembro, router]);

  let estado: EstadoDeLaInvitacion;
  if (cuenta.isError) {
    estado = { tipo: 'error', error: detalleDeError(cuenta.error) };
  } else if (cuenta.data === null) {
    estado = { tipo: 'sin-sesion', token };
  } else if (invitacion.isError) {
    estado = { tipo: 'error', error: detalleDeError(invitacion.error) };
  } else if (invitacion.data === undefined) {
    estado = { tipo: 'consultando' };
  } else {
    estado = {
      tipo: 'lista',
      invitacion: invitacion.data,
      uniendo: unirse.isPending,
      error: unirse.isError ? detalleDeError(unirse.error) : undefined,
      reenvio: reenviar.isPending ? 'enviando' : reenviar.isSuccess ? 'enviado' : 'inicial',
    };
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-h2">{mensajes.grupos.invitacion.titulo}</h1>
      <VistaDeInvitacion
        estado={estado}
        onUnirme={() => {
          unirse.mutate(undefined, {
            onSuccess: (union) => {
              router.push(`/grupos/${union.grupoId}`);
            },
          });
        }}
        onReintentar={() => {
          void cuenta.refetch().then(() => invitacion.refetch());
        }}
        onReenviar={() => {
          if (cuenta.data !== undefined && cuenta.data !== null) {
            reenviar.mutate(cuenta.data.email);
          }
        }}
      />
    </main>
  );
}
