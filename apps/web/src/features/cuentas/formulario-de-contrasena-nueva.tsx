'use client';

// RF-006 y RNF-014: definir la contraseña nueva con el enlace del mail.
import Link from 'next/link';
import type { SubmitEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { mensajes } from '@/messages/es-AR';

import type { ErrorDeCuentas } from './consultas';
import { claseDeLink } from './marco';
import { textoDeError } from './textos';

const t = mensajes.cuentas;

export type EstadoDeContrasenaNueva =
  | { tipo: 'editando'; enviando: boolean; errorDeCampo?: string | undefined }
  | { tipo: 'lista' }
  | { tipo: 'error'; error: ErrorDeCuentas };

export interface FormularioDeContrasenaNuevaProps {
  estado: EstadoDeContrasenaNueva;
  onEnviar: (contrasenaNueva: string) => void;
}

export function FormularioDeContrasenaNueva({
  estado,
  onEnviar,
}: FormularioDeContrasenaNuevaProps) {
  if (estado.tipo === 'lista') {
    return (
      <div className="flex flex-col gap-4">
        <Alert variante="success">{t.recuperacion.nuevaLista}</Alert>
        <Link href="/ingresar" className={claseDeLink}>
          {t.recuperacion.nuevaIngresar}
        </Link>
      </div>
    );
  }
  if (estado.tipo === 'error') {
    return (
      <div className="flex flex-col gap-4">
        <Alert variante="destructive" role="alert">
          {textoDeError(estado.error)}
        </Alert>
        <Link href="/recuperar" className={claseDeLink}>
          {t.recuperacion.pedirOtro}
        </Link>
      </div>
    );
  }

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = new FormData(evento.currentTarget).get('contrasenaNueva');
    onEnviar(typeof valor === 'string' ? valor : '');
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <TextField
        name="contrasenaNueva"
        type="password"
        autoComplete="new-password"
        label={t.campos.contrasenaNueva}
        ayuda={t.ayudas.contrasena}
        error={estado.errorDeCampo}
      />
      <Button type="submit" tamano="lg" cargando={estado.enviando}>
        {t.recuperacion.nuevaEnviar}
      </Button>
    </form>
  );
}
