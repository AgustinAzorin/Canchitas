import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EstadoDeLaApi } from './estado-de-la-api';

const meta = {
  title: 'Salud/EstadoDeLaApi',
  component: EstadoDeLaApi,
} satisfies Meta<typeof EstadoDeLaApi>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Consultando: Story = { args: { estado: undefined } };

export const EnLinea: Story = {
  args: {
    estado: { tipo: 'en-linea', version: '1.4.0', instante: new Date('2026-10-10T02:00:00Z') },
  },
};

export const BaseCaida: Story = { args: { estado: { tipo: 'base-caida' } } };

export const SinConexion: Story = { args: { estado: { tipo: 'sin-conexion' } } };
