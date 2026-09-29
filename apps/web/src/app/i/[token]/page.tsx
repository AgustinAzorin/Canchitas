import type { Metadata } from 'next';

import { PantallaDeInvitacion } from '@/features/grupos/pantalla-de-invitacion';
import { mensajes } from '@/messages/es-AR';

// RF-011: entrada por link de invitación. En Android, el mismo link abre la app (App Links).
export const metadata: Metadata = {
  title: `${mensajes.grupos.invitacion.titulo} · ${mensajes.app.nombre}`,
  // El link es una credencial: que no lo indexe nadie ni viaje en el Referer.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function Pagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PantallaDeInvitacion token={token} />;
}
