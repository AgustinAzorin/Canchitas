import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { mensajes } from '@/messages/es-AR';
import { barlow, barlowCondensed } from '@/styles/fuentes.generated';

import { Proveedores } from './proveedores';
import './globals.css';

export const metadata: Metadata = {
  title: mensajes.app.nombre,
  description: mensajes.app.descripcion,
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
