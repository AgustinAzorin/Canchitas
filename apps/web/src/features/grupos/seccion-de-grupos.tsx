'use client';

// Inicio con sesión: los grupos del usuario y el formulario para crear uno (RF-010).
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { detalleDeError } from '@/lib/api/llamar';
import { useCuentaActual } from '@/features/cuentas/consultas';
import { mensajes } from '@/messages/es-AR';

import { useCrearGrupo, useMisGrupos } from './consultas';
import { FormularioDeGrupo } from './formulario-de-grupo';
import { ListaDeGrupos } from './lista-de-grupos';
import { validarNombreDeGrupo } from './validacion';

export function SeccionDeGrupos() {
  const router = useRouter();
  const { data: cuenta } = useCuentaActual();
  const conSesion = cuenta !== undefined && cuenta !== null;
  const misGrupos = useMisGrupos(conSesion);
  const crear = useCrearGrupo();
  const [nombre, setNombre] = useState('');
  const [errorDeCampo, setErrorDeCampo] = useState<string | undefined>();

  if (!conSesion) {
    return null;
  }

  return (
    <section aria-labelledby="titulo-grupos" className="flex flex-col gap-4">
      <h2 id="titulo-grupos" className="text-h3">
        {mensajes.grupos.titulo}
      </h2>
      <ListaDeGrupos
        grupos={misGrupos.data?.grupos}
        error={misGrupos.isError ? detalleDeError(misGrupos.error) : undefined}
      />
      <FormularioDeGrupo
        key={nombre}
        nombre={nombre}
        enviando={crear.isPending}
        errorDeCampo={errorDeCampo}
        error={crear.isError ? detalleDeError(crear.error) : undefined}
        onEnviar={(valor) => {
          setNombre(valor);
          const local = validarNombreDeGrupo(valor);
          setErrorDeCampo(local);
          crear.reset();
          if (local === undefined) {
            crear.mutate(valor, {
              onSuccess: (grupo) => {
                router.push(`/grupos/${grupo.id}`);
              },
            });
          }
        }}
      />
    </section>
  );
}
