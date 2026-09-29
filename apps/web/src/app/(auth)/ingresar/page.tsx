import type { Metadata } from 'next';

import { PantallaDeIngreso } from '@/features/cuentas/pantalla-de-ingreso';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.ingreso.titulo} · ${mensajes.app.nombre}`,
};

export default function Pagina() {
  return <PantallaDeIngreso />;
}
