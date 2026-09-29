import type { Metadata } from 'next';

import { PantallaDeIngreso } from '@/features/cuentas/pantalla-de-ingreso';
import { invitacionDe, type ConParametros } from '@/features/cuentas/invitacion-pendiente';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.ingreso.titulo} · ${mensajes.app.nombre}`,
};

export default async function Pagina({ searchParams }: ConParametros) {
  return <PantallaDeIngreso invitacion={invitacionDe(await searchParams)} />;
}
