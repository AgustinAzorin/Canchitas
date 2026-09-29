import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { DetalleDeGrupo } from './detalle-de-grupo';
import type { Grupo, Invitacion } from './consultas';
import { FormularioDeGrupo } from './formulario-de-grupo';
import { VistaDeInvitacion } from './invitacion';
import { ListaDeGrupos } from './lista-de-grupos';

// Cada estado de las pantallas de grupos (RF-010, RF-011, RF-012), con los textos de es-AR.ts.
const meta = {
  title: 'Grupos',
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const id = '0b8a5c2e-3f1d-4c6b-9a7e-2d4f6b8c1e3a';

const grupoDeAdmin: Grupo = {
  id,
  nombre: 'Los del jueves',
  cantidadMiembros: 8,
  rol: 'admin',
  link: 'https://canchitas.app/i/Xq3v9KpL2mNb7RtY1sWd0A',
  acciones: [
    'ver_link',
    'regenerar_link',
    'crear_votacion',
    'crear_partido',
    'armar_equipos',
    'cargar_resultado',
    'registrar_costo',
    'marcar_pago',
  ],
};

const grupoDeJugador: Grupo = { ...grupoDeAdmin, rol: 'jugador', link: null, acciones: [] };

const invitacion: Invitacion = {
  grupoId: id,
  nombre: 'Los del jueves',
  cantidadMiembros: 8,
  estado: 'puede_unirse',
};

export const ListaConsultando: Story = { render: () => <ListaDeGrupos grupos={undefined} /> };

export const ListaVacia: Story = { render: () => <ListaDeGrupos grupos={[]} /> };

export const ListaConGrupos: Story = {
  render: () => (
    <ListaDeGrupos
      grupos={[
        { id, nombre: 'Los del jueves', cantidadMiembros: 8, rol: 'admin' },
        {
          id: '5d2c7a9b-1e4f-4a3c-8b6d-9f0e2a4c6b8d',
          nombre: 'Fútbol 11 de los domingos con los primos',
          cantidadMiembros: 1,
          rol: 'jugador',
        },
      ]}
    />
  ),
};

export const ListaSinConexion: Story = {
  render: () => <ListaDeGrupos grupos={undefined} error={{ tipo: 'sin-conexion' }} />,
};

export const CrearVacio: Story = {
  render: () => <FormularioDeGrupo enviando={false} onEnviar={fn()} />,
};

export const CrearNombreVacio: Story = {
  render: () => (
    <FormularioDeGrupo enviando={false} errorDeCampo="Completá este campo." onEnviar={fn()} />
  ),
};

export const CrearEnviando: Story = {
  render: () => <FormularioDeGrupo enviando nombre="Los del jueves" onEnviar={fn()} />,
};

export const CrearSinVerificar: Story = {
  render: () => (
    <FormularioDeGrupo
      enviando={false}
      nombre="Los del jueves"
      error={{ tipo: 'api', codigo: 'cuenta-sin-verificar' }}
      onEnviar={fn()}
    />
  ),
};

export const GrupoConsultando: Story = { render: () => <DetalleDeGrupo grupo={undefined} /> };

export const GrupoDeAdmin: Story = { render: () => <DetalleDeGrupo grupo={grupoDeAdmin} /> };

export const GrupoLinkCopiado: Story = {
  render: () => <DetalleDeGrupo grupo={grupoDeAdmin} copiado />,
};

export const GrupoConfirmandoRegeneracion: Story = {
  render: () => <DetalleDeGrupo grupo={grupoDeAdmin} regeneracion="confirmando" />,
};

export const GrupoLinkRegenerado: Story = {
  render: () => <DetalleDeGrupo grupo={grupoDeAdmin} regeneracion="regenerado" />,
};

export const GrupoDeJugador: Story = { render: () => <DetalleDeGrupo grupo={grupoDeJugador} /> };

export const GrupoNoEncontrado: Story = {
  render: () => (
    <DetalleDeGrupo grupo={undefined} error={{ tipo: 'api', codigo: 'grupo-no-encontrado' }} />
  ),
};

export const InvitacionSinSesion: Story = {
  render: () => <VistaDeInvitacion estado={{ tipo: 'sin-sesion', token: 'ejemplo' }} />,
};

export const InvitacionConsultando: Story = {
  render: () => <VistaDeInvitacion estado={{ tipo: 'consultando' }} />,
};

export const InvitacionPuedeUnirse: Story = {
  render: () => <VistaDeInvitacion estado={{ tipo: 'lista', invitacion }} onUnirme={fn()} />,
};

export const InvitacionUniendo: Story = {
  render: () => <VistaDeInvitacion estado={{ tipo: 'lista', invitacion, uniendo: true }} />,
};

export const InvitacionYaEsMiembro: Story = {
  render: () => (
    <VistaDeInvitacion
      estado={{ tipo: 'lista', invitacion: { ...invitacion, estado: 'ya_es_miembro' } }}
    />
  ),
};

export const InvitacionSinVerificar: Story = {
  render: () => (
    <VistaDeInvitacion
      estado={{ tipo: 'lista', invitacion: { ...invitacion, estado: 'cuenta_sin_verificar' } }}
      onReenviar={fn()}
      onReintentar={fn()}
    />
  ),
};

export const InvitacionSinVerificarReenviado: Story = {
  render: () => (
    <VistaDeInvitacion
      estado={{
        tipo: 'lista',
        invitacion: { ...invitacion, estado: 'cuenta_sin_verificar' },
        reenvio: 'enviado',
      }}
    />
  ),
};

export const InvitacionExpulsado: Story = {
  render: () => (
    <VistaDeInvitacion
      estado={{ tipo: 'lista', invitacion: { ...invitacion, estado: 'expulsado' } }}
    />
  ),
};

export const InvitacionLinkInvalido: Story = {
  render: () => (
    <VistaDeInvitacion
      estado={{ tipo: 'error', error: { tipo: 'api', codigo: 'link-invalido' } }}
    />
  ),
};
