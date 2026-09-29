'use client';

// El grupo como lo ve cada rol. El link y el botón de regenerar aparecen solo si la API los
// manda (RN-26, RF-012): la web no decide permisos.
import Link from 'next/link';
import { ChevronLeft, Copy, LoaderCircle, RefreshCw } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ErrorDeApi } from '@/lib/api/llamar';
import { mensajes } from '@/messages/es-AR';

import type { Grupo } from './consultas';
import { textoDeError, textoDeRol } from './textos';

const t = mensajes.grupos.detalle;

export type EstadoDeRegeneracion = 'inicial' | 'confirmando' | 'regenerando' | 'regenerado';

export interface DetalleDeGrupoProps {
  /** undefined: consultando. */
  grupo: Grupo | undefined;
  error?: ErrorDeApi | undefined;
  copiado?: boolean;
  regeneracion?: EstadoDeRegeneracion;
  errorDeRegeneracion?: ErrorDeApi | undefined;
  onCopiar?: (link: string) => void;
  onPedirRegeneracion?: () => void;
  onConfirmarRegeneracion?: () => void;
  onCancelarRegeneracion?: () => void;
}

const claseDeVolver =
  'inline-flex min-h-12 items-center gap-1 self-start text-label text-primary underline underline-offset-4';

export function DetalleDeGrupo({
  grupo,
  error,
  copiado = false,
  regeneracion = 'inicial',
  errorDeRegeneracion,
  onCopiar,
  onPedirRegeneracion,
  onConfirmarRegeneracion,
  onCancelarRegeneracion,
}: DetalleDeGrupoProps) {
  const volver = (
    <Link href="/" className={claseDeVolver}>
      <ChevronLeft aria-hidden className="size-4" />
      {t.volver}
    </Link>
  );

  if (error !== undefined) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <Alert variante="destructive" role="alert">
          {textoDeError(error)}
        </Alert>
      </div>
    );
  }
  if (grupo === undefined) {
    return (
      <div className="flex flex-col gap-4">
        {volver}
        <p role="status" className="flex items-center gap-2 text-body text-muted-foreground">
          <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
          {t.consultando}
        </p>
      </div>
    );
  }

  const { link } = grupo;
  const puedeRegenerar = grupo.acciones.includes('regenerar_link');

  return (
    <div className="flex flex-col gap-6">
      {volver}
      <header className="flex flex-col gap-1">
        <h1 className="text-h2 break-words">{grupo.nombre}</h1>
        <p className="text-body text-muted-foreground">
          <span className="tabular-nums">{mensajes.grupos.miembros(grupo.cantidadMiembros)}</span>
          {' · '}
          {t.tuRol(textoDeRol(grupo.rol))}
        </p>
      </header>

      {link === null ? (
        <p className="text-body text-muted-foreground">{t.sinLink}</p>
      ) : (
        <section aria-labelledby="titulo-link" className="flex flex-col gap-3">
          <h2 id="titulo-link" className="text-h4">
            {t.linkTitulo}
          </h2>
          <p className="text-body-sm text-muted-foreground">{t.linkAyuda}</p>
          <p className="rounded-md border border-border bg-surface px-3 py-3 font-mono text-body-sm break-all text-surface-foreground">
            {link}
          </p>
          {regeneracion === 'regenerado' && <Alert variante="success">{t.regenerado}</Alert>}
          {copiado && <Alert variante="info">{t.copiado}</Alert>}
          {errorDeRegeneracion !== undefined && (
            <Alert variante="destructive" role="alert">
              {textoDeError(errorDeRegeneracion)}
            </Alert>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              icono={<Copy aria-hidden className="size-4" />}
              onClick={() => {
                onCopiar?.(link);
              }}
            >
              {t.copiar}
            </Button>
            {puedeRegenerar && regeneracion !== 'confirmando' && (
              <Button
                variante="outline"
                icono={<RefreshCw aria-hidden className="size-4" />}
                cargando={regeneracion === 'regenerando'}
                onClick={onPedirRegeneracion}
              >
                {t.regenerar}
              </Button>
            )}
          </div>
          {puedeRegenerar && regeneracion === 'confirmando' && (
            <Alert variante="warning" role="alert">
              <p>{t.regenerarAviso}</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variante="outline"
                  className="border-warning-foreground text-warning-foreground hover:bg-transparent"
                  onClick={onConfirmarRegeneracion}
                >
                  {t.regenerarConfirmar}
                </Button>
                <Button
                  variante="ghost"
                  className="text-warning-foreground hover:bg-transparent"
                  onClick={onCancelarRegeneracion}
                >
                  {t.regenerarCancelar}
                </Button>
              </div>
            </Alert>
          )}
        </section>
      )}
    </div>
  );
}
