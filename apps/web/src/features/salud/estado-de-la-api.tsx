import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';

import { formatearFechaYHora } from '@/lib/formato';
import { mensajes } from '@/messages/es-AR';

import type { EstadoDeLaApi as Estado } from './consultas';

const textos = mensajes.salud;

/** Muestra el estado con texto e ícono: el color refuerza, no reemplaza (GUIDELINES). */
export function EstadoDeLaApi({ estado }: { estado: Estado | undefined }) {
  return (
    <section
      aria-labelledby="titulo-salud"
      className="rounded-lg border border-border bg-surface p-4 text-surface-foreground"
    >
      <h2 id="titulo-salud" className="text-h4">
        {textos.titulo}
      </h2>
      <div role="status" className="mt-2">
        {estado === undefined && (
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
            {textos.consultando}
          </p>
        )}
        {estado?.tipo === 'en-linea' && (
          <>
            <p className="flex items-center gap-2 text-body-sm">
              <CircleCheck aria-hidden className="size-4 text-success" />
              {textos.enLinea}
            </p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body-sm">
              <dt className="text-muted-foreground">{textos.version}</dt>
              <dd className="tabular-nums">{estado.version}</dd>
              <dt className="text-muted-foreground">{textos.horaDelServidor}</dt>
              <dd className="tabular-nums">
                <time dateTime={estado.instante.toISOString()}>
                  {formatearFechaYHora(estado.instante)}
                </time>
              </dd>
            </dl>
          </>
        )}
        {(estado?.tipo === 'base-caida' || estado?.tipo === 'sin-conexion') && (
          <p className="flex items-center gap-2 text-body-sm">
            <CircleAlert aria-hidden className="size-4 shrink-0 text-destructive" />
            {estado.tipo === 'base-caida' ? textos.baseCaida : textos.sinConexion}
          </p>
        )}
      </div>
    </section>
  );
}
