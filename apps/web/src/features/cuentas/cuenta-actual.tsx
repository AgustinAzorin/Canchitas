'use client';

// RF-004, RF-005 y RF-007 en la pantalla de inicio: quién tiene la sesión, si falta verificar
// el mail y el botón para cerrar la sesión.
import Link from 'next/link';
import { LoaderCircle, LogOut } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { mensajes } from '@/messages/es-AR';

import type { Cuenta } from './consultas';
import { claseDeLink } from './marco';

const t = mensajes.cuentas;

export interface CuentaActualProps {
  /** undefined: consultando. null: sin sesión. */
  cuenta: Cuenta | null | undefined;
  cerrando: boolean;
  reenvio: 'inicial' | 'enviando' | 'enviado';
  onCerrarSesion: () => void;
  onReenviar: () => void;
}

export function CuentaActual({
  cuenta,
  cerrando,
  reenvio,
  onCerrarSesion,
  onReenviar,
}: CuentaActualProps) {
  if (cuenta === undefined) {
    return (
      <section aria-busy="true" aria-labelledby="titulo-cuenta" className="min-h-12">
        <h2 id="titulo-cuenta" className="sr-only">
          {t.sesion.consultando}
        </h2>
        <LoaderCircle
          aria-hidden
          className="size-4 text-muted-foreground motion-safe:animate-spin"
        />
      </section>
    );
  }
  if (cuenta === null) {
    return (
      <section aria-labelledby="titulo-cuenta" className="flex flex-col gap-3">
        <h2 id="titulo-cuenta" className="text-body">
          {t.sesion.sinSesion}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/ingresar"
            className="inline-flex h-12 items-center rounded-md bg-primary px-4 text-label text-primary-foreground"
          >
            {t.sesion.ingresar}
          </Link>
          <Link href="/registro" className={claseDeLink}>
            {t.sesion.crearCuenta}
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section aria-labelledby="titulo-cuenta" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-cuenta" className="text-h3">
          {t.sesion.hola(cuenta.nombreUsuario)}
        </h2>
        <Button
          variante="outline"
          icono={<LogOut aria-hidden className="size-4" />}
          cargando={cerrando}
          onClick={onCerrarSesion}
        >
          {t.sesion.cerrar}
        </Button>
      </div>
      {cuenta.estado === 'sin_verificar' && (
        <Alert variante="warning">
          <p>{t.verificacion.sinVerificar}</p>
          {reenvio === 'enviado' ? (
            <p>{t.verificacion.reenviado}</p>
          ) : (
            <Button
              variante="outline"
              className="self-start border-warning-foreground text-warning-foreground hover:bg-transparent"
              cargando={reenvio === 'enviando'}
              onClick={onReenviar}
            >
              {t.verificacion.reenviar}
            </Button>
          )}
        </Alert>
      )}
    </section>
  );
}
