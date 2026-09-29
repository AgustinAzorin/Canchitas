'use client';

// RF-004 y RNF-014: resultado de abrir el enlace de verificación.
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { mensajes } from '@/messages/es-AR';

import type { ErrorDeCuentas } from './consultas';
import { claseDeLink } from './marco';
import { textoDeError } from './textos';

const t = mensajes.cuentas.verificacion;

export type EstadoDeVerificacion =
  { tipo: 'verificando' } | { tipo: 'activa' } | { tipo: 'error'; error: ErrorDeCuentas };

export function Verificacion({ estado }: { estado: EstadoDeVerificacion }) {
  switch (estado.tipo) {
    case 'verificando':
      return (
        <p role="status" className="flex items-center gap-2 text-body text-muted-foreground">
          <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
          {t.verificando}
        </p>
      );
    case 'activa':
      return (
        <div className="flex flex-col gap-4">
          <Alert variante="success">{t.activa}</Alert>
          <Link href="/" className={claseDeLink}>
            {t.continuar}
          </Link>
        </div>
      );
    case 'error':
      return (
        <Alert variante="destructive" role="alert">
          {textoDeError(estado.error)}
        </Alert>
      );
  }
}
