'use client';

// RF-010 y RF-011: los grupos de quien tiene la sesión, para entrar a cada uno.
import Link from 'next/link';
import { ChevronRight, LoaderCircle, Users } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import type { ErrorDeApi } from '@/lib/api/llamar';
import { mensajes } from '@/messages/es-AR';

import type { ResumenDeGrupo } from './consultas';
import { textoDeError, textoDeRol } from './textos';

const t = mensajes.grupos;

export interface ListaDeGruposProps {
  /** undefined: consultando. */
  grupos: readonly ResumenDeGrupo[] | undefined;
  error?: ErrorDeApi | undefined;
}

export function ListaDeGrupos({ grupos, error }: ListaDeGruposProps) {
  if (error !== undefined) {
    return (
      <Alert variante="destructive" role="alert">
        {textoDeError(error)}
      </Alert>
    );
  }
  if (grupos === undefined) {
    return (
      <p role="status" className="flex items-center gap-2 text-body text-muted-foreground">
        <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
        {t.consultando}
      </p>
    );
  }
  if (grupos.length === 0) {
    return <p className="text-body text-muted-foreground">{t.ninguno}</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
      {grupos.map((grupo) => (
        <li key={grupo.id}>
          <Link
            href={`/grupos/${grupo.id}`}
            className="flex min-h-14 items-center gap-3 px-4 py-2 text-surface-foreground hover:bg-accent"
          >
            <Users aria-hidden className="size-5 shrink-0 text-muted-foreground" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-label">{grupo.nombre}</span>
              <span className="text-caption text-muted-foreground">
                <span className="tabular-nums">{t.miembros(grupo.cantidadMiembros)}</span>
                {' · '}
                {textoDeRol(grupo.rol)}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
