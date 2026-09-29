'use client';

// RF-004: pedir otro mail de verificación.
import type { SubmitEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { mensajes } from '@/messages/es-AR';

const t = mensajes.cuentas;

export interface FormularioDeReenvioProps {
  estado: 'inicial' | 'enviando' | 'enviado';
  error?: string | undefined;
  onEnviar: (email: string) => void;
}

export function FormularioDeReenvio({ estado, error, onEnviar }: FormularioDeReenvioProps) {
  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = new FormData(evento.currentTarget).get('email');
    onEnviar(typeof email === 'string' ? email : '');
  }

  return (
    <form
      noValidate
      onSubmit={enviar}
      aria-labelledby="titulo-reenvio"
      className="flex flex-col gap-4"
    >
      <h2 id="titulo-reenvio" className="text-h4">
        {t.verificacion.reenviarTitulo}
      </h2>
      {estado === 'enviado' && <Alert variante="info">{t.verificacion.reenviado}</Alert>}
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={t.campos.email}
        error={error}
      />
      <Button type="submit" variante="secondary" cargando={estado === 'enviando'}>
        {t.verificacion.reenviar}
      </Button>
    </form>
  );
}
