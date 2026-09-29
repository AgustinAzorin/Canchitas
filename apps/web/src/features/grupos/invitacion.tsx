'use client';

// RF-011, RF-004 y RN-27: lo que se ve al abrir un link de invitación. Sin sesión, nada del grupo:
// se ofrece iniciar sesión o registrarse y volver acá.
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ErrorDeApi } from '@/lib/api/llamar';
import { mensajes } from '@/messages/es-AR';

import type { Invitacion } from './consultas';
import { textoDeError } from './textos';

const t = mensajes.grupos.invitacion;

const claseDeLink =
  'inline-flex min-h-12 items-center text-label text-primary underline underline-offset-4';

type Reenvio = 'inicial' | 'enviando' | 'enviado';

export type EstadoDeLaInvitacion =
  | { tipo: 'consultando' }
  | { tipo: 'sin-sesion'; token: string }
  | { tipo: 'error'; error: ErrorDeApi }
  | {
      tipo: 'lista';
      invitacion: Invitacion;
      uniendo?: boolean;
      error?: ErrorDeApi | undefined;
      reenvio?: Reenvio;
    };

export interface VistaDeInvitacionProps {
  estado: EstadoDeLaInvitacion;
  onUnirme?: () => void;
  onReintentar?: () => void;
  onReenviar?: () => void;
}

export function VistaDeInvitacion({
  estado,
  onUnirme,
  onReintentar,
  onReenviar,
}: VistaDeInvitacionProps) {
  switch (estado.tipo) {
    case 'consultando':
      return (
        <p role="status" className="flex items-center gap-2 text-body text-muted-foreground">
          <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
          {t.consultando}
        </p>
      );
    case 'sin-sesion': {
      const invitacion = encodeURIComponent(estado.token);
      return (
        <section className="flex flex-col gap-4">
          <p className="text-body">{t.sinSesion}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href={`/ingresar?invitacion=${invitacion}`}
              className="inline-flex h-12 items-center rounded-md bg-primary px-4 text-label text-primary-foreground"
            >
              {t.ingresar}
            </Link>
            <Link href={`/registro?invitacion=${invitacion}`} className={claseDeLink}>
              {t.registrarse}
            </Link>
          </div>
        </section>
      );
    }
    case 'error':
      return (
        <Alert variante="destructive" role="alert">
          {textoDeError(estado.error)}
        </Alert>
      );
    case 'lista':
      return (
        <section aria-labelledby="titulo-grupo" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-body text-muted-foreground">{t.teInvitan}</p>
            <h2 id="titulo-grupo" className="text-h3 break-words">
              {estado.invitacion.nombre}
            </h2>
            <p className="text-body text-muted-foreground tabular-nums">
              {mensajes.grupos.miembros(estado.invitacion.cantidadMiembros)}
            </p>
          </div>
          {estado.error !== undefined && (
            <Alert variante="destructive" role="alert">
              {textoDeError(estado.error)}
            </Alert>
          )}
          <Accion
            invitacion={estado.invitacion}
            uniendo={estado.uniendo ?? false}
            reenvio={estado.reenvio ?? 'inicial'}
            onUnirme={onUnirme}
            onReintentar={onReintentar}
            onReenviar={onReenviar}
          />
        </section>
      );
  }
}

interface AccionProps {
  invitacion: Invitacion;
  uniendo: boolean;
  reenvio: Reenvio;
  onUnirme: (() => void) | undefined;
  onReintentar: (() => void) | undefined;
  onReenviar: (() => void) | undefined;
}

function Accion({ invitacion, uniendo, reenvio, onUnirme, onReintentar, onReenviar }: AccionProps) {
  switch (invitacion.estado) {
    case 'puede_unirse':
      return (
        <Button tamano="lg" cargando={uniendo} onClick={onUnirme}>
          {t.unirme}
        </Button>
      );
    case 'ya_es_miembro':
      return (
        <div className="flex flex-col gap-3">
          <Alert variante="info">{t.yaSosMiembro}</Alert>
          <Link href={`/grupos/${invitacion.grupoId}`} className={claseDeLink}>
            {t.irAlGrupo}
          </Link>
        </div>
      );
    case 'cuenta_sin_verificar':
      // RF-004: se impide unirse y se ofrece reenviar el mail de verificación.
      return (
        <Alert variante="warning">
          <p>{t.sinVerificar}</p>
          {reenvio === 'enviado' && <p>{mensajes.cuentas.verificacion.reenviado}</p>}
          <div className="flex flex-wrap gap-3">
            {reenvio !== 'enviado' && (
              <Button
                variante="outline"
                className="border-warning-foreground text-warning-foreground hover:bg-transparent"
                cargando={reenvio === 'enviando'}
                onClick={onReenviar}
              >
                {mensajes.cuentas.verificacion.reenviar}
              </Button>
            )}
            <Button
              variante="ghost"
              className="text-warning-foreground hover:bg-transparent"
              onClick={onReintentar}
            >
              {t.yaVerifique}
            </Button>
          </div>
        </Alert>
      );
    case 'expulsado':
      return (
        <Alert variante="destructive" role="alert">
          {t.expulsado}
        </Alert>
      );
  }
}
