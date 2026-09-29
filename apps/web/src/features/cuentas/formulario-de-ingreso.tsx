'use client';

// RF-005 y RNF-011: inicio de sesión con mail y contraseña.
import Link from 'next/link';
import type { SubmitEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { mensajes } from '@/messages/es-AR';

import type { ErrorDeCuentas } from './consultas';
import { claseDeLink } from './marco';
import { textoDeError } from './textos';
import type { Errores } from './validacion';

const t = mensajes.cuentas;

export interface FormularioDeIngresoProps {
  enviando: boolean;
  erroresDeCampo?: Errores<'email' | 'contrasena'>;
  error?: ErrorDeCuentas | undefined;
  email?: string;
  onEnviar: (datos: { email: string; contrasena: string }) => void;
}

export function FormularioDeIngreso({
  enviando,
  erroresDeCampo = {},
  error,
  email,
  onEnviar,
}: FormularioDeIngresoProps) {
  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const texto = (campo: string) => {
      const valor = datos.get(campo);
      return typeof valor === 'string' ? valor : '';
    };
    onEnviar({ email: texto('email'), contrasena: texto('contrasena') });
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      {error !== undefined && (
        <Alert variante="destructive" role="alert">
          {textoDeError(error)}
        </Alert>
      )}
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={t.campos.email}
        defaultValue={email}
        error={erroresDeCampo.email}
      />
      <TextField
        name="contrasena"
        type="password"
        autoComplete="current-password"
        label={t.campos.contrasena}
        error={erroresDeCampo.contrasena}
      />
      <Button type="submit" tamano="lg" cargando={enviando}>
        {t.ingreso.enviar}
      </Button>
      <Link href="/recuperar" className={claseDeLink}>
        {t.ingreso.olvido}
      </Link>
      <p className="flex flex-wrap items-center gap-x-1 text-body-sm text-muted-foreground">
        {t.ingreso.sinCuenta}
        <Link href="/registro" className={claseDeLink}>
          {t.ingreso.registrarse}
        </Link>
      </p>
    </form>
  );
}
