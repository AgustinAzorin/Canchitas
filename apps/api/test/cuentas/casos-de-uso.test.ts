// Casos de uso de cuentas con puertos en memoria (ADR 0014).
import { describe, expect, it } from 'vitest';

import { crearCerrarSesion } from '../../src/modules/cuentas/application/cerrar-sesion.ts';
import { crearConsultarCuentaActual } from '../../src/modules/cuentas/application/consultar-cuenta-actual.ts';
import { crearIniciarSesion } from '../../src/modules/cuentas/application/iniciar-sesion.ts';
import { crearRegistrarCuenta } from '../../src/modules/cuentas/application/registrar-cuenta.ts';
import { crearRestablecerContrasena } from '../../src/modules/cuentas/application/restablecer-contrasena.ts';
import { crearVerificarEmail } from '../../src/modules/cuentas/application/verificar-email.ts';
import { duracionDelBloqueoMs } from '../../src/modules/cuentas/domain/bloqueo.ts';
import { identidadEnMemoria, intentosEnMemoria, relojFijo } from './fakes.ts';

// 29/09/2026 a las 01:00 en Buenos Aires: en UTC ya es 29, a las 04:00.
const ahora = new Date('2026-09-29T04:00:00.000Z');

const alta = {
  email: 'Ana@Mail.com',
  contrasena: 'una-contrasena',
  nombreUsuario: 'Ana_10',
  fechaNacimiento: '2000-01-01',
  aceptaPrivacidad: true,
};

function registrar() {
  const identidad = identidadEnMemoria();
  const clock = relojFijo(ahora);
  const registrarCuenta = crearRegistrarCuenta({ identidad, cuentas: identidad.cuentas, clock });
  return { identidad, registrarCuenta };
}

describe('RF-001 — registrarse con mail y contraseña', () => {
  it('crea la cuenta con el mail y el nombre en minúsculas y la fecha de aceptación', async () => {
    const { identidad, registrarCuenta } = registrar();

    const resultado = await registrarCuenta(alta);

    expect(resultado._unsafeUnwrap()).toEqual({ email: 'ana@mail.com', nombreUsuario: 'ana_10' });
    expect(identidad.altas).toEqual([
      {
        email: 'ana@mail.com',
        contrasena: 'una-contrasena',
        nombreUsuario: 'ana_10',
        fechaNacimiento: '2000-01-01',
        privacidadAceptadaEn: ahora,
      },
    ]);
  });

  it('rechaza un mail ya registrado sin importar mayúsculas', async () => {
    const { identidad, registrarCuenta } = registrar();
    await registrarCuenta(alta);

    const resultado = await registrarCuenta({
      ...alta,
      email: 'ANA@mail.com',
      nombreUsuario: 'otra',
    });

    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'EmailEnUso' });
    expect(identidad.altas).toHaveLength(1);
  });

  it('si otra alta gana la carrera por el mismo mail, informa el mail en uso', async () => {
    const { identidad, registrarCuenta } = registrar();
    identidad.alCrear = () => {
      identidad.agregar({ email: 'ana@mail.com', nombreUsuario: 'rapida' });
    };

    expect((await registrarCuenta(alta))._unsafeUnwrapErr()).toEqual({ tipo: 'EmailEnUso' });
  });
});

describe('RF-002 y RN-20 — validar la edad en el registro', () => {
  it('rechaza 17 años e informa la edad requerida', async () => {
    const { identidad, registrarCuenta } = registrar();

    const resultado = await registrarCuenta({ ...alta, fechaNacimiento: '2009-01-01' });

    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'MenorDeEdad', edadMinima: 18 });
    expect(identidad.altas).toHaveLength(0);
  });

  it('acepta 18 años cumplidos hoy en hora argentina', async () => {
    const { registrarCuenta } = registrar();
    expect((await registrarCuenta({ ...alta, fechaNacimiento: '2008-09-29' })).isOk()).toBe(true);
  });

  it('cuenta el día en Argentina, no en UTC', async () => {
    const identidad = identidadEnMemoria();
    // 29/09 a las 23:30 en Buenos Aires ya es 30/09 en UTC: todavía no cumplió.
    const registrarCuenta = crearRegistrarCuenta({
      identidad,
      cuentas: identidad.cuentas,
      clock: relojFijo(new Date('2026-09-30T02:30:00.000Z')),
    });
    const resultado = await registrarCuenta({ ...alta, fechaNacimiento: '2008-09-30' });
    expect(resultado._unsafeUnwrapErr()).toMatchObject({ tipo: 'MenorDeEdad' });
  });

  it('rechaza una fecha que no existe', async () => {
    const { registrarCuenta } = registrar();
    const resultado = await registrarCuenta({ ...alta, fechaNacimiento: '2001-02-29' });
    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'FechaInvalida' });
  });
});

describe('RF-003 — nombre de usuario único', () => {
  it('rechaza un nombre tomado antes de crear la cuenta', async () => {
    const { identidad, registrarCuenta } = registrar();
    identidad.agregar({ email: 'otro@mail.com', nombreUsuario: 'ana_10' });

    const resultado = await registrarCuenta({ ...alta, nombreUsuario: 'ANA_10' });

    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'NombreDeUsuarioEnUso' });
    expect(identidad.altas).toHaveLength(0);
  });

  it('rechaza un nombre con formato inválido', async () => {
    const { registrarCuenta } = registrar();
    const resultado = await registrarCuenta({ ...alta, nombreUsuario: 'ana perez' });
    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'NombreDeUsuarioInvalido' });
  });
});

describe('RNF-018 — aceptar la política de privacidad', () => {
  it('sin aceptación no hay cuenta', async () => {
    const { identidad, registrarCuenta } = registrar();
    const resultado = await registrarCuenta({ ...alta, aceptaPrivacidad: false });
    expect(resultado._unsafeUnwrapErr()).toEqual({ tipo: 'PrivacidadNoAceptada' });
    expect(identidad.altas).toHaveLength(0);
  });
});

describe('RF-005 y RNF-011 — iniciar sesión con bloqueo', () => {
  function inicio(instante = ahora) {
    const identidad = identidadEnMemoria();
    identidad.agregar({ email: 'ana@mail.com', nombreUsuario: 'ana', contrasena: 'correcta-123' });
    const intentos = intentosEnMemoria();
    const reloj = { instante };
    const iniciarSesion = crearIniciarSesion({
      identidad,
      cuentas: identidad.cuentas,
      intentos,
      clock: { ahora: () => reloj.instante },
    });
    return { iniciarSesion, intentos, reloj };
  }

  it('con mail y contraseña correctos devuelve la sesión y la cuenta', async () => {
    const { iniciarSesion } = inicio();
    const resultado = await iniciarSesion({ email: ' ANA@mail.com ', contrasena: 'correcta-123' });
    expect(resultado._unsafeUnwrap().cuenta).toMatchObject({
      email: 'ana@mail.com',
      nombreUsuario: 'ana',
    });
  });

  it('una contraseña incorrecta y un mail inexistente dan el mismo error', async () => {
    const { iniciarSesion } = inicio();
    const malaContrasena = await iniciarSesion({ email: 'ana@mail.com', contrasena: 'otra-cosa' });
    const malMail = await iniciarSesion({ email: 'nadie@mail.com', contrasena: 'correcta-123' });
    expect(malaContrasena._unsafeUnwrapErr()).toEqual({ tipo: 'CredencialesInvalidas' });
    expect(malMail._unsafeUnwrapErr()).toEqual({ tipo: 'CredencialesInvalidas' });
  });

  it('el quinto fallo bloquea 15 minutos, aun con la contraseña correcta', async () => {
    const { iniciarSesion, reloj } = inicio();
    for (let i = 0; i < 4; i++) {
      await iniciarSesion({ email: 'ana@mail.com', contrasena: 'mala' });
    }
    const quinto = await iniciarSesion({ email: 'ana@mail.com', contrasena: 'mala' });
    const hasta = new Date(ahora.getTime() + duracionDelBloqueoMs);
    expect(quinto._unsafeUnwrapErr()).toEqual({ tipo: 'CuentaBloqueada', hasta });

    const correcta = await iniciarSesion({ email: 'ana@mail.com', contrasena: 'correcta-123' });
    expect(correcta._unsafeUnwrapErr()).toEqual({ tipo: 'CuentaBloqueada', hasta });

    reloj.instante = hasta;
    expect(
      (await iniciarSesion({ email: 'ana@mail.com', contrasena: 'correcta-123' })).isOk(),
    ).toBe(true);
  });

  it('un inicio correcto reinicia el conteo', async () => {
    const { iniciarSesion, intentos } = inicio();
    for (let i = 0; i < 4; i++) {
      await iniciarSesion({ email: 'ana@mail.com', contrasena: 'mala' });
    }
    await iniciarSesion({ email: 'ana@mail.com', contrasena: 'correcta-123' });
    expect(await intentos.leer('ana@mail.com')).toEqual({
      fallidosConsecutivos: 0,
      bloqueadoHasta: null,
    });
  });

  it('bloquea también mails sin cuenta, para no revelar cuáles existen', async () => {
    const { iniciarSesion } = inicio();
    let ultimo;
    for (let i = 0; i < 5; i++) {
      ultimo = await iniciarSesion({ email: 'nadie@mail.com', contrasena: 'mala' });
    }
    expect(ultimo?._unsafeUnwrapErr()).toMatchObject({ tipo: 'CuentaBloqueada' });
  });
});

describe('RF-004 y RNF-014 — verificar el mail', () => {
  it('activa la cuenta y rechaza el enlace si se vuelve a usar', async () => {
    const identidad = identidadEnMemoria();
    identidad.agregar({ email: 'ana@mail.com', nombreUsuario: 'ana' });
    const verificarEmail = crearVerificarEmail({ identidad, cuentas: identidad.cuentas });

    expect((await verificarEmail('token-ana@mail.com')).isOk()).toBe(true);
    expect((await identidad.cuentas.buscar('id-ana'))?.estado).toBe('activa');
    expect((await verificarEmail('token-ana@mail.com'))._unsafeUnwrapErr()).toEqual({
      tipo: 'EnlaceUsado',
    });
  });

  it('rechaza un enlace inválido o vencido', async () => {
    const identidad = identidadEnMemoria();
    const verificarEmail = crearVerificarEmail({ identidad, cuentas: identidad.cuentas });
    expect((await verificarEmail('cualquiera'))._unsafeUnwrapErr()).toEqual({
      tipo: 'EnlaceInvalido',
    });
  });
});

describe('RF-006 y RNF-014 — recuperar la contraseña', () => {
  it('rechaza el enlace ya usado', async () => {
    const identidad = identidadEnMemoria();
    identidad.agregar({ email: 'ana@mail.com', nombreUsuario: 'ana' });
    const restablecer = crearRestablecerContrasena({ identidad });

    const token = identidad.tokenDeRecuperacion('ana@mail.com');
    expect((await restablecer({ token, contrasenaNueva: 'nueva-clave-1' })).isOk()).toBe(true);
    expect(
      (await restablecer({ token, contrasenaNueva: 'nueva-clave-2' }))._unsafeUnwrapErr(),
    ).toEqual({
      tipo: 'EnlaceInvalido',
    });
  });
});

describe('RF-007 — cerrar sesión', () => {
  it('cierra la sesión actual y después no hay cuenta para mostrar', async () => {
    const identidad = identidadEnMemoria();
    identidad.agregar({ email: 'ana@mail.com', nombreUsuario: 'ana', contrasena: 'x' });
    const sesion = await identidad.iniciarSesion('ana@mail.com', 'x');
    const encabezados = new Headers({ authorization: `Bearer ${sesion?.token ?? ''}` });
    const cerrarSesion = crearCerrarSesion({ identidad });
    const consultar = crearConsultarCuentaActual({ identidad, cuentas: identidad.cuentas });

    expect((await consultar(encabezados)).isOk()).toBe(true);
    expect((await cerrarSesion(encabezados)).isOk()).toBe(true);
    expect((await consultar(encabezados))._unsafeUnwrapErr()).toEqual({ tipo: 'SinSesion' });
    expect((await cerrarSesion(encabezados))._unsafeUnwrapErr()).toEqual({ tipo: 'SinSesion' });
  });
});
