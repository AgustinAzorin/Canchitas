'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { mensajes } from '@/messages/es-AR';

import { detalleDeError, useIniciarSesion } from './consultas';
import { FormularioDeIngreso } from './formulario-de-ingreso';
import { destinoDespuesDeIngresar } from './invitacion-pendiente';
import { Marco } from './marco';
import { validarEmail, type Errores } from './validacion';

export function PantallaDeIngreso({ invitacion }: { invitacion?: string | undefined }) {
  const router = useRouter();
  const iniciar = useIniciarSesion();
  const [email, setEmail] = useState('');
  const [errores, setErrores] = useState<Errores<'email' | 'contrasena'>>({});

  return (
    <Marco titulo={mensajes.cuentas.ingreso.titulo}>
      <FormularioDeIngreso
        key={email}
        email={email}
        invitacion={invitacion}
        enviando={iniciar.isPending}
        erroresDeCampo={errores}
        error={iniciar.isError ? detalleDeError(iniciar.error) : undefined}
        onEnviar={(datos) => {
          setEmail(datos.email);
          const errorDeEmail = validarEmail(datos.email);
          const locales: Errores<'email' | 'contrasena'> = {
            ...(errorDeEmail === undefined ? {} : { email: errorDeEmail }),
            ...(datos.contrasena === '' ? { contrasena: mensajes.comun.campoObligatorio } : {}),
          };
          setErrores(locales);
          iniciar.reset();
          if (Object.keys(locales).length === 0) {
            iniciar.mutate(datos, {
              onSuccess: () => {
                router.push(destinoDespuesDeIngresar(invitacion));
              },
            });
          }
        }}
      />
    </Marco>
  );
}
