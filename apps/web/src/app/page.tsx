import { SeccionDeSalud } from '@/features/salud/seccion-de-salud';
import { mensajes } from '@/messages/es-AR';

export default function Inicio() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
      <header>
        <h1 className="text-h2 md:text-h1">{mensajes.app.nombre}</h1>
        <p className="mt-1 text-body text-muted-foreground">{mensajes.app.descripcion}</p>
      </header>
      <SeccionDeSalud />
    </main>
  );
}
