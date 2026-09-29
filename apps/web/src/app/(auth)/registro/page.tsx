import type { Metadata } from 'next';

import { PantallaDeRegistro } from '@/features/cuentas/pantalla-de-registro';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.registro.titulo} · ${mensajes.app.nombre}`,
};

export default function Pagina() {
  return <PantallaDeRegistro />;
}
