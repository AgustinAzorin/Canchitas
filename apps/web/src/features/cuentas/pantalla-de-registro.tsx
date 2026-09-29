'use client';

import { useState } from 'react';

import { mensajes } from '@/messages/es-AR';

import {
  detalleDeError,
  useReenviarVerificacion,
  useRegistrar,
  type SolicitudDeAlta,
} from './consultas';
import { FormularioDeRegistro, type CampoDeAlta } from './formulario-de-registro';
import { Marco } from './marco';
import { RegistroListo } from './registro-listo';
import { validarRegistro, type Errores } from './validacion';

export function PantallaDeRegistro({ invitacion }: { invitacion?: string | undefined }) {
  const registrar = useRegistrar();
  const reenviar = useReenviarVerificacion();
  const [valores, setValores] = useState<Partial<SolicitudDeAlta>>({});
  const [errores, setErrores] = useState<Errores<CampoDeAlta>>({});

  if (registrar.isSuccess) {
    const { email } = registrar.data;
    return (
      <Marco titulo={mensajes.cuentas.registro.titulo}>
        <RegistroListo
          email={email}
          invitacion={invitacion}
          reenvio={reenviar.isPending ? 'enviando' : reenviar.isSuccess ? 'enviado' : 'inicial'}
          onReenviar={() => {
            reenviar.mutate(email);
          }}
        />
      </Marco>
    );
  }

  return (
    <Marco titulo={mensajes.cuentas.registro.titulo}>
      <FormularioDeRegistro
        // Se vuelve a montar con los valores que se enviaron para no perderlos.
        key={JSON.stringify(valores)}
        valores={valores}
        invitacion={invitacion}
        enviando={registrar.isPending}
        erroresDeCampo={errores}
        error={registrar.isError ? detalleDeError(registrar.error) : undefined}
        onEnviar={(datos) => {
          setValores(datos);
          const locales = validarRegistro(datos);
          setErrores(locales);
          registrar.reset();
          if (Object.keys(locales).length === 0) {
            registrar.mutate({ ...datos, nombreUsuario: datos.nombreUsuario.trim() });
          }
        }}
      />
    </Marco>
  );
}
