import type { Metadata } from 'next';

import { PantallaDeRecuperacion } from '@/features/cuentas/pantalla-de-recuperacion';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.recuperacion.titulo} · ${mensajes.app.nombre}`,
};

export default function Pagina() {
  return <PantallaDeRecuperacion />;
}
