'use client';

// RF-006: pedir el enlace para definir una contraseña nueva.
import Link from 'next/link';
import type { SubmitEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { mensajes } from '@/messages/es-AR';

import { claseDeLink } from './marco';

const t = mensajes.cuentas;

export interface FormularioDeRecuperacionProps {
  estado: 'inicial' | 'enviando' | 'enviado';
  error?: string | undefined;
  onEnviar: (email: string) => void;
}

export function FormularioDeRecuperacion({
  estado,
  error,
  onEnviar,
}: FormularioDeRecuperacionProps) {
  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = new FormData(evento.currentTarget).get('email');
    onEnviar(typeof email === 'string' ? email : '');
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      <p className="text-body">{t.recuperacion.explicacion}</p>
      {estado === 'enviado' && <Alert variante="info">{t.recuperacion.enviado}</Alert>}
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={t.campos.email}
        error={error}
      />
      <Button type="submit" tamano="lg" cargando={estado === 'enviando'}>
        {t.recuperacion.enviar}
      </Button>
      <Link href="/ingresar" className={claseDeLink}>
        {t.ingreso.titulo}
      </Link>
    </form>
  );
}
