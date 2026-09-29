import type { Metadata } from 'next';

import { PantallaDeVerificacion } from '@/features/cuentas/pantalla-de-verificacion';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.verificacion.titulo} · ${mensajes.app.nombre}`,
};

export default function Pagina() {
  return <PantallaDeVerificacion />;
}
