// Marco común de las pantallas de cuenta: una columna angosta y centrada (GUIDELINES, layout).
import type { ReactNode } from 'react';

export function Marco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <h1 className="text-h2">{titulo}</h1>
      {children}
    </main>
  );
}

/** Link de navegación: texto subrayado, no botón (GUIDELINES, Button). */
export const claseDeLink =
  'inline-flex min-h-12 items-center text-label text-primary underline underline-offset-4';
