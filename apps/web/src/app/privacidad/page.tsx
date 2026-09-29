// RNF-018: la política se muestra antes de aceptarla. El texto es provisorio hasta M9.
import type { Metadata } from 'next';

import { Alert } from '@/components/ui/alert';
import { mensajes } from '@/messages/es-AR';

const t = mensajes.cuentas.privacidad;

export const metadata: Metadata = { title: `${t.titulo} · ${mensajes.app.nombre}` };

export default function Pagina() {
  return (
    <main className="mx-auto flex max-w-prose flex-col gap-4 px-4 py-8">
      <h1 className="text-h2">{t.titulo}</h1>
      <Alert variante="warning">{t.provisoria}</Alert>
      {t.parrafos.map((parrafo) => (
        <p key={parrafo} className="text-body">
          {parrafo}
        </p>
      ))}
    </main>
  );
}
