'use client';

// RF-001 y RF-004: la cuenta quedó sin verificar; se puede reenviar el mail.
import Link from 'next/link';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { mensajes } from '@/messages/es-AR';

import { claseDeLink } from './marco';

const t = mensajes.cuentas;

export interface RegistroListoProps {
  email: string;
  reenvio: 'inicial' | 'enviando' | 'enviado';
  onReenviar: () => void;
}

export function RegistroListo({ email, reenvio, onReenviar }: RegistroListoProps) {
  return (
    <section aria-labelledby="titulo-listo" className="flex flex-col gap-4">
      <h2 id="titulo-listo" className="text-h4">
        {t.registro.listoTitulo}
      </h2>
      <p className="text-body">{t.registro.listo(email)}</p>
      {reenvio === 'enviado' && <Alert variante="info">{t.verificacion.reenviado}</Alert>}
      <Button variante="outline" cargando={reenvio === 'enviando'} onClick={onReenviar}>
        {t.verificacion.reenviar}
      </Button>
      <Link href="/ingresar" className={claseDeLink}>
        {t.registro.listoIngresar}
      </Link>
    </section>
  );
}
