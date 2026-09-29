'use client';

// Pantalla de un grupo: nombre, miembros, rol y, si la API lo manda, el link con sus acciones.
import { useState } from 'react';

import { detalleDeError } from '@/lib/api/llamar';

import { useGrupo, useRegenerarLink } from './consultas';
import { DetalleDeGrupo, type EstadoDeRegeneracion } from './detalle-de-grupo';

export function PantallaDeGrupo({ grupoId }: { grupoId: string }) {
  const grupo = useGrupo(grupoId);
  const regenerar = useRegenerarLink(grupoId);
  const [copiado, setCopiado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const regeneracion: EstadoDeRegeneracion = confirmando
    ? 'confirmando'
    : regenerar.isPending
      ? 'regenerando'
      : regenerar.isSuccess
        ? 'regenerado'
        : 'inicial';

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <DetalleDeGrupo
        grupo={grupo.data}
        error={grupo.isError ? detalleDeError(grupo.error) : undefined}
        copiado={copiado}
        regeneracion={regeneracion}
        errorDeRegeneracion={regenerar.isError ? detalleDeError(regenerar.error) : undefined}
        onCopiar={(link) => {
          void navigator.clipboard.writeText(link).then(() => {
            setCopiado(true);
          });
        }}
        onPedirRegeneracion={() => {
          regenerar.reset();
          setCopiado(false);
          setConfirmando(true);
        }}
        onCancelarRegeneracion={() => {
          setConfirmando(false);
        }}
        onConfirmarRegeneracion={() => {
          setConfirmando(false);
          regenerar.mutate();
        }}
      />
    </main>
  );
}
