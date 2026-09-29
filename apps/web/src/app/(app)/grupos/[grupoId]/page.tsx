import type { Metadata } from 'next';

import { PantallaDeGrupo } from '@/features/grupos/pantalla-de-grupo';
import { mensajes } from '@/messages/es-AR';

export const metadata: Metadata = {
  title: `${mensajes.grupos.titulo} · ${mensajes.app.nombre}`,
};

export default async function Pagina({ params }: { params: Promise<{ grupoId: string }> }) {
  const { grupoId } = await params;
  return <PantallaDeGrupo grupoId={grupoId} />;
}
