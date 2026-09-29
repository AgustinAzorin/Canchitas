import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Mail } from 'lucide-react';

import { Alert } from './alert';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { TextField } from './text-field';

// Componentes base del design system (GUIDELINES, Componentes).
const meta = { title: 'Design system/Base' } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Botones: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Button>Confirmo</Button>
      <Button variante="secondary">Me bajo</Button>
      <Button variante="outline" icono={<Mail aria-hidden className="size-4" />}>
        Reenviar mail
      </Button>
      <Button variante="ghost">Volver</Button>
      <Button variante="destructive">Pinchar partido</Button>
      <Button cargando>Guardando</Button>
      <Button disabled>Deshabilitado</Button>
      <Button tamano="lg">Crear cuenta</Button>
    </div>
  ),
};

export const Campos: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-4">
      <TextField label="Mail" type="email" defaultValue="ana@mail.com" />
      <TextField label="Contraseña" type="password" ayuda="Entre 8 y 128 caracteres." />
      <TextField
        label="Fecha de nacimiento"
        type="date"
        defaultValue="2010-01-01"
        error="Tenés que tener 18 años o más para registrarte."
      />
      <TextField label="Deshabilitado" disabled defaultValue="No se puede editar" />
      <Checkbox>Recordar esta opción</Checkbox>
      <Checkbox error="Marcá esta casilla para seguir.">Con error</Checkbox>
    </div>
  ),
};

export const Alertas: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Alert variante="info">Te mandamos un enlace nuevo.</Alert>
      <Alert variante="success">Listo, tu cuenta está activa.</Alert>
      <Alert variante="warning">Tu mail no está verificado.</Alert>
      <Alert variante="destructive">El enlace venció o no es válido.</Alert>
    </div>
  ),
};
