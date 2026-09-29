import type { Metadata } from 'next';

import { PantallaDeContrasenaNueva } from '@/features/cuentas/pantalla-de-contrasena-nueva';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.cuentas.recuperacion.nuevaTitulo} · ${mensajes.app.nombre}`,
};

export default function Pagina() {
  return <PantallaDeContrasenaNueva />;
}
