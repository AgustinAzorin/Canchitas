'use client';

// RF-010: crear un grupo con un nombre.
import type { SubmitEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import type { ErrorDeApi } from '@/lib/api/llamar';
import { mensajes } from '@/messages/es-AR';

import { textoDeError } from './textos';

const t = mensajes.grupos.crear;

export interface FormularioDeGrupoProps {
  enviando: boolean;
  nombre?: string;
  errorDeCampo?: string | undefined;
  error?: ErrorDeApi | undefined;
  onEnviar: (nombre: string) => void;
}

export function FormularioDeGrupo({
  enviando,
  nombre,
  errorDeCampo,
  error,
  onEnviar,
}: FormularioDeGrupoProps) {
  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const valor = new FormData(evento.currentTarget).get('nombre');
    onEnviar(typeof valor === 'string' ? valor : '');
  }

  return (
    <form
      noValidate
      onSubmit={enviar}
      aria-labelledby="titulo-crear-grupo"
      className="flex flex-col gap-4"
    >
      <h3 id="titulo-crear-grupo" className="text-h4">
        {t.titulo}
      </h3>
      {error !== undefined && (
        <Alert variante="destructive" role="alert">
          {textoDeError(error)}
        </Alert>
      )}
      <TextField
        name="nombre"
        label={t.nombre}
        ayuda={t.ayuda}
        autoComplete="off"
        defaultValue={nombre}
        error={errorDeCampo}
      />
      <Button type="submit" tamano="lg" cargando={enviando}>
        {t.enviar}
      </Button>
    </form>
  );
}
