import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';

import { mensajes } from '@/messages/es-AR';

import { CuentaActual } from './cuenta-actual';
import { FormularioDeContrasenaNueva } from './formulario-de-contrasena-nueva';
import { FormularioDeIngreso } from './formulario-de-ingreso';
import { FormularioDeRecuperacion } from './formulario-de-recuperacion';
import { FormularioDeReenvio } from './formulario-de-reenvio';
import { FormularioDeRegistro } from './formulario-de-registro';
import { Marco } from './marco';
import { RegistroListo } from './registro-listo';
import { Verificacion } from './verificacion';

// Cada estado de las pantallas de cuentas (RF-001 a RF-007), con los textos de es-AR.ts.
const meta = {
  title: 'Cuentas',
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

const v = mensajes.cuentas.validacion;
const valores = {
  email: 'ana@mail.com',
  contrasena: 'una-contrasena',
  nombreUsuario: 'ana_10',
  fechaNacimiento: '1995-05-20',
  aceptaPrivacidad: true,
};

export const RegistroVacio: Story = {
  render: () => <FormularioDeRegistro enviando={false} onEnviar={fn()} />,
};

export const RegistroConErroresDeCampo: Story = {
  render: () => (
    <FormularioDeRegistro
      enviando={false}
      valores={{ email: 'ana@', nombreUsuario: 'ana perez' }}
      erroresDeCampo={{
        email: v.email,
        contrasena: v.contrasenaCorta,
        nombreUsuario: v.nombreUsuario,
        fechaNacimiento: mensajes.comun.campoObligatorio,
        aceptaPrivacidad: v.privacidad,
      }}
      onEnviar={fn()}
    />
  ),
};

export const RegistroEnviando: Story = {
  render: () => <FormularioDeRegistro enviando valores={valores} onEnviar={fn()} />,
};

export const RegistroMailEnUso: Story = {
  render: () => (
    <FormularioDeRegistro
      enviando={false}
      valores={valores}
      error={{ tipo: 'api', codigo: 'email-en-uso' }}
      onEnviar={fn()}
    />
  ),
};

export const RegistroMenorDeEdad: Story = {
  render: () => (
    <FormularioDeRegistro
      enviando={false}
      valores={{ ...valores, fechaNacimiento: '2010-03-01' }}
      error={{ tipo: 'api', codigo: 'menor-de-edad' }}
      onEnviar={fn()}
    />
  ),
};

export const RegistroNombreEnUso: Story = {
  render: () => (
    <FormularioDeRegistro
      enviando={false}
      valores={valores}
      error={{ tipo: 'api', codigo: 'nombre-de-usuario-en-uso' }}
      onEnviar={fn()}
    />
  ),
};

export const RegistroSinConexion: Story = {
  render: () => (
    <FormularioDeRegistro
      enviando={false}
      valores={valores}
      error={{ tipo: 'sin-conexion' }}
      onEnviar={fn()}
    />
  ),
};

export const RegistroListoParaVerificar: Story = {
  render: () => <RegistroListo email="ana@mail.com" reenvio="inicial" onReenviar={fn()} />,
};

export const RegistroListoReenviado: Story = {
  render: () => <RegistroListo email="ana@mail.com" reenvio="enviado" onReenviar={fn()} />,
};

export const IngresoVacio: Story = {
  render: () => <FormularioDeIngreso enviando={false} onEnviar={fn()} />,
};

export const IngresoConErroresDeCampo: Story = {
  render: () => (
    <FormularioDeIngreso
      enviando={false}
      email="ana@"
      erroresDeCampo={{ email: v.email, contrasena: mensajes.comun.campoObligatorio }}
      onEnviar={fn()}
    />
  ),
};

export const IngresoEnviando: Story = {
  render: () => <FormularioDeIngreso enviando email="ana@mail.com" onEnviar={fn()} />,
};

export const IngresoCredencialesInvalidas: Story = {
  render: () => (
    <FormularioDeIngreso
      enviando={false}
      email="ana@mail.com"
      error={{ tipo: 'api', codigo: 'credenciales-invalidas' }}
      onEnviar={fn()}
    />
  ),
};

export const IngresoBloqueado: Story = {
  render: () => (
    <FormularioDeIngreso
      enviando={false}
      email="ana@mail.com"
      error={{ tipo: 'api', codigo: 'cuenta-bloqueada' }}
      onEnviar={fn()}
    />
  ),
};

export const VerificacionEnCurso: Story = {
  render: () => <Verificacion estado={{ tipo: 'verificando' }} />,
};

export const VerificacionActiva: Story = {
  render: () => <Verificacion estado={{ tipo: 'activa' }} />,
};

export const VerificacionEnlaceUsado: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Verificacion estado={{ tipo: 'error', error: { tipo: 'api', codigo: 'enlace-usado' } }} />
      <FormularioDeReenvio estado="inicial" onEnviar={fn()} />
    </div>
  ),
};

export const VerificacionEnlaceVencido: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <Verificacion estado={{ tipo: 'error', error: { tipo: 'api', codigo: 'enlace-invalido' } }} />
      <FormularioDeReenvio estado="enviado" onEnviar={fn()} />
    </div>
  ),
};

export const RecuperacionVacia: Story = {
  render: () => <FormularioDeRecuperacion estado="inicial" onEnviar={fn()} />,
};

export const RecuperacionConError: Story = {
  render: () => <FormularioDeRecuperacion estado="inicial" error={v.email} onEnviar={fn()} />,
};

export const RecuperacionEnviando: Story = {
  render: () => <FormularioDeRecuperacion estado="enviando" onEnviar={fn()} />,
};

export const RecuperacionEnviada: Story = {
  render: () => <FormularioDeRecuperacion estado="enviado" onEnviar={fn()} />,
};

export const ContrasenaNueva: Story = {
  render: () => (
    <FormularioDeContrasenaNueva estado={{ tipo: 'editando', enviando: false }} onEnviar={fn()} />
  ),
};

export const ContrasenaNuevaCorta: Story = {
  render: () => (
    <FormularioDeContrasenaNueva
      estado={{ tipo: 'editando', enviando: false, errorDeCampo: v.contrasenaCorta }}
      onEnviar={fn()}
    />
  ),
};

export const ContrasenaNuevaGuardando: Story = {
  render: () => (
    <FormularioDeContrasenaNueva estado={{ tipo: 'editando', enviando: true }} onEnviar={fn()} />
  ),
};

export const ContrasenaNuevaLista: Story = {
  render: () => <FormularioDeContrasenaNueva estado={{ tipo: 'lista' }} onEnviar={fn()} />,
};

export const ContrasenaNuevaEnlaceInvalido: Story = {
  render: () => (
    <FormularioDeContrasenaNueva
      estado={{ tipo: 'error', error: { tipo: 'api', codigo: 'enlace-invalido' } }}
      onEnviar={fn()}
    />
  ),
};

const cuenta = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'ana@mail.com',
  nombreUsuario: 'ana_10',
  estado: 'activa' as const,
};
const accionesDeCuenta = {
  cerrando: false,
  reenvio: 'inicial' as const,
  onCerrarSesion: fn(),
  onReenviar: fn(),
};

export const SesionConsultando: Story = {
  render: () => <CuentaActual cuenta={undefined} {...accionesDeCuenta} />,
};

export const SinSesion: Story = {
  render: () => <CuentaActual cuenta={null} {...accionesDeCuenta} />,
};

export const SesionActiva: Story = {
  render: () => <CuentaActual cuenta={cuenta} {...accionesDeCuenta} />,
};

export const SesionSinVerificar: Story = {
  render: () => (
    <CuentaActual cuenta={{ ...cuenta, estado: 'sin_verificar' }} {...accionesDeCuenta} />
  ),
};

export const SesionSinVerificarReenviado: Story = {
  render: () => (
    <CuentaActual
      cuenta={{ ...cuenta, estado: 'sin_verificar' }}
      {...accionesDeCuenta}
      reenvio="enviado"
    />
  ),
};

export const SesionCerrando: Story = {
  render: () => <CuentaActual cuenta={cuenta} {...accionesDeCuenta} cerrando />,
};

export const PantallaCompleta: Story = {
  render: () => (
    <Marco titulo={mensajes.cuentas.ingreso.titulo}>
      <FormularioDeIngreso enviando={false} onEnviar={fn()} />
    </Marco>
  ),
};
