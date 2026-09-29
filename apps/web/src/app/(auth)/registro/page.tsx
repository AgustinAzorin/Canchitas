import type { Metadata } from 'next';

import { PantallaDeRegistro } from '@/features/cuentas/pantalla-de-registro';
import { invitacionDe } from '@/features/cuentas/invitacion-pendiente';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.registro.titulo} · ${mensajes.app.nombre}`,
};

export default async function Pagina({ searchParams }: PageProps<'/registro'>) {
  return <PantallaDeRegistro invitacion={invitacionDe(await searchParams)} />;
}
