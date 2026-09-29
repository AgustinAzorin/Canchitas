'use client';

// RF-001, RF-002, RF-003 y RNF-018: formulario de alta.
import Link from 'next/link';
import type { SubmitEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TextField } from '@/components/ui/text-field';
import { mensajes } from '@/messages/es-AR';

import type { ErrorDeCuentas, SolicitudDeAlta } from './consultas';
import { claseDeLink } from './marco';
import { textoDeError } from './textos';
import type { Errores } from './validacion';

const t = mensajes.cuentas;

export type CampoDeAlta = keyof SolicitudDeAlta;

/** Errores de la API que corresponden a un campo; el resto va arriba del formulario. */
const campoDelError: Readonly<Record<string, CampoDeAlta>> = {
  'email-en-uso': 'email',
  'nombre-de-usuario-en-uso': 'nombreUsuario',
  'nombre-de-usuario-invalido': 'nombreUsuario',
  'menor-de-edad': 'fechaNacimiento',
  'fecha-invalida': 'fechaNacimiento',
  'privacidad-no-aceptada': 'aceptaPrivacidad',
};

export interface FormularioDeRegistroProps {
  enviando: boolean;
  erroresDeCampo?: Errores<CampoDeAlta>;
  error?: ErrorDeCuentas | undefined;
  valores?: Partial<SolicitudDeAlta>;
  onEnviar: (datos: SolicitudDeAlta) => void;
}

export function FormularioDeRegistro({
  enviando,
  erroresDeCampo = {},
  error,
  valores = {},
  onEnviar,
}: FormularioDeRegistroProps) {
  const campoDeApi = error?.tipo === 'api' ? campoDelError[error.codigo] : undefined;
  const errores: Errores<CampoDeAlta> =
    campoDeApi === undefined || error === undefined
      ? erroresDeCampo
      : { ...erroresDeCampo, [campoDeApi]: textoDeError(error) };
  const errorGeneral =
    error !== undefined && campoDeApi === undefined ? textoDeError(error) : undefined;

  function enviar(evento: SubmitEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const texto = (campo: string) => {
      const valor = datos.get(campo);
      return typeof valor === 'string' ? valor : '';
    };
    onEnviar({
      email: texto('email'),
      contrasena: texto('contrasena'),
      nombreUsuario: texto('nombreUsuario'),
      fechaNacimiento: texto('fechaNacimiento'),
      aceptaPrivacidad: datos.get('aceptaPrivacidad') === 'on',
    });
  }

  return (
    <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
      {errorGeneral !== undefined && (
        <Alert variante="destructive" role="alert">
          {errorGeneral}
        </Alert>
      )}
      <TextField
        name="email"
        type="email"
        autoComplete="email"
        label={t.campos.email}
        defaultValue={valores.email}
        error={errores.email}
      />
      <TextField
        name="contrasena"
        type="password"
        autoComplete="new-password"
        label={t.campos.contrasena}
        ayuda={t.ayudas.contrasena}
        defaultValue={valores.contrasena}
        error={errores.contrasena}
      />
      <TextField
        name="nombreUsuario"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        label={t.campos.nombreUsuario}
        ayuda={t.ayudas.nombreUsuario}
        defaultValue={valores.nombreUsuario}
        error={errores.nombreUsuario}
      />
      <TextField
        name="fechaNacimiento"
        type="date"
        autoComplete="bday"
        label={t.campos.fechaNacimiento}
        ayuda={t.ayudas.fechaNacimiento}
        defaultValue={valores.fechaNacimiento}
        error={errores.fechaNacimiento}
      />
      <Checkbox
        name="aceptaPrivacidad"
        defaultChecked={valores.aceptaPrivacidad}
        error={errores.aceptaPrivacidad}
      >
        {t.registro.privacidadAntes}
        <Link
          href="/privacidad"
          target="_blank"
          className="text-primary underline underline-offset-4"
        >
          {t.registro.privacidadLink}
        </Link>
      </Checkbox>
      <Button type="submit" tamano="lg" cargando={enviando}>
        {t.registro.enviar}
      </Button>
      <p className="flex flex-wrap items-center gap-x-1 text-body-sm text-muted-foreground">
        {t.registro.yaTenesCuenta}
        <Link href="/ingresar" className={claseDeLink}>
          {t.registro.ingresar}
        </Link>
      </p>
    </form>
  );
}
