// Cuentas de punta a punta en la web contra el stack local, con los mails en Mailpit
// (RF-001 a RF-007, RNF-011, RNF-014, RNF-018, RNF-019, RNF-020).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { enlaceDelMail } from './mailpit';

const asuntoVerificacion = 'Verificá tu mail en Canchitas';
const asuntoRecuperacion = 'Definí una contraseña nueva para Canchitas';
const contrasena = 'una-contrasena-segura';

function personaNueva() {
  const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  return { email: `e2e.${id}@mail.com`, nombreUsuario: `e2e_${id}`.slice(0, 20) };
}

async function sinFallasDeAccesibilidad(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(resultado.violations).toEqual([]);
}

async function completarRegistro(
  page: Page,
  datos: { email: string; nombreUsuario: string; fechaNacimiento?: string },
) {
  await page.goto('/registro');
  await page.getByLabel('Mail').fill(datos.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await page.getByLabel('Nombre de usuario').fill(datos.nombreUsuario);
  await page.getByLabel('Fecha de nacimiento').fill(datos.fechaNacimiento ?? '1995-05-20');
  await page.getByLabel(/Leí y acepto/).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
}

async function ingresar(page: Page, email: string, clave = contrasena) {
  await page.goto('/ingresar');
  await page.getByLabel('Mail').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(clave);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

/** Alta y verificación por la API, para los tests que no prueban el registro. */
async function cuentaActiva(page: Page) {
  const persona = personaNueva();
  const alta = await page.request.post('/v1/cuentas', {
    data: { ...persona, contrasena, fechaNacimiento: '1990-01-01', aceptaPrivacidad: true },
  });
  expect(alta.status()).toBe(201);
  await page.goto(await enlaceDelMail(persona.email, asuntoVerificacion));
  await expect(page.getByText('Listo, tu cuenta está activa.')).toBeVisible();
  return persona;
}

test.describe('RF-001 a RF-007 — cuenta de punta a punta', () => {
  test('registro, verificación, inicio y cierre de sesión', async ({ page, context }) => {
    const persona = personaNueva();

    // RF-001: alta sin verificar y mail de verificación.
    await completarRegistro(page, persona);
    await expect(page.getByRole('heading', { name: 'Revisá tu mail' })).toBeVisible();
    await expect(page.getByText(persona.email)).toBeVisible();
    await sinFallasDeAccesibilidad(page);

    // RF-004: el enlace activa la cuenta. RNF-014: la segunda vez se rechaza.
    const enlace = await enlaceDelMail(persona.email, asuntoVerificacion);
    await page.goto(enlace);
    await expect(page.getByText('Listo, tu cuenta está activa.')).toBeVisible();
    await sinFallasDeAccesibilidad(page);
    await page.goto('/');
    await page.goto(enlace);
    await expect(page.getByRole('main').getByRole('alert')).toHaveText('Este enlace ya se usó.');

    // RF-005: inicio de sesión con cookie HttpOnly, Secure y SameSite=Lax (ADR 0009).
    await ingresar(page, persona.email);
    await expect(
      page.getByRole('heading', { name: `Hola, ${persona.nombreUsuario}` }),
    ).toBeVisible();
    const cookie = (await context.cookies()).find(
      (c) => c.name === '__Secure-canchitas.session_token',
    );
    expect(cookie).toMatchObject({ httpOnly: true, secure: true, sameSite: 'Lax' });
    await expect(page.getByText(/no está verificado/)).toHaveCount(0);

    // RF-007: al cerrar la sesión deja de mostrar sus datos.
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await page.goto('/');
    await expect(page.getByText('Iniciá sesión para ver tus grupos y partidos.')).toBeVisible();
    await expect(page.getByText(persona.nombreUsuario)).toHaveCount(0);
    expect(
      (await context.cookies()).some((c) => c.name === '__Secure-canchitas.session_token'),
    ).toBe(false);
  });

  test('RF-004 — con el mail sin verificar se ve el aviso y se puede reenviar', async ({
    page,
  }) => {
    const persona = personaNueva();
    await completarRegistro(page, persona);
    await expect(page.getByRole('heading', { name: 'Revisá tu mail' })).toBeVisible();

    await ingresar(page, persona.email);

    await expect(page.getByText(/Tu mail no está verificado/)).toBeVisible();
    await page.getByRole('button', { name: 'Reenviar mail' }).click();
    await expect(page.getByText(/te mandamos un enlace nuevo/)).toBeVisible();
    await sinFallasDeAccesibilidad(page);
  });
});

test.describe('RF-001, RF-002, RF-003 y RNF-018 — errores del registro', () => {
  test('RF-002 — rechaza a un menor de 18 e informa la edad requerida', async ({ page }) => {
    const hoy = new Date();
    const hace17 = `${String(hoy.getFullYear() - 17)}-01-01`;
    await completarRegistro(page, { ...personaNueva(), fechaNacimiento: hace17 });

    await expect(page.getByText('Tenés que tener 18 años o más para registrarte.')).toBeVisible();
    await sinFallasDeAccesibilidad(page);
  });

  test('RF-003 — rechaza un nombre de usuario tomado', async ({ page }) => {
    const primera = await cuentaActiva(page);
    await completarRegistro(page, { ...personaNueva(), nombreUsuario: primera.nombreUsuario });

    await expect(
      page.getByText('Ese nombre de usuario ya está en uso. Probá con otro.'),
    ).toBeVisible();
  });

  test('RF-001 — rechaza un mail en uso', async ({ page }) => {
    const primera = await cuentaActiva(page);
    await completarRegistro(page, { ...personaNueva(), email: primera.email });

    await expect(page.getByText(/Ese mail ya está en uso/)).toBeVisible();
  });

  test('RNF-018 — sin aceptar la política no se envía, y la política se puede leer', async ({
    page,
  }) => {
    await page.goto('/registro');
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(
      page.getByText('Para crear la cuenta tenés que aceptar la política de privacidad.'),
    ).toBeVisible();

    await page.goto('/privacidad');
    await expect(page.getByRole('heading', { name: 'Política de privacidad' })).toBeVisible();
    await sinFallasDeAccesibilidad(page);
  });
});

test.describe('RF-005 y RNF-011 — inicio de sesión', () => {
  test('una contraseña incorrecta no dice qué falló, y 5 fallos bloquean', async ({ page }) => {
    const persona = await cuentaActiva(page);

    await ingresar(page, persona.email, 'otra-contrasena');
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'El mail o la contraseña no son correctos.',
    );
    await sinFallasDeAccesibilidad(page);

    for (let i = 0; i < 4; i++) {
      await page.getByLabel('Contraseña', { exact: true }).fill('otra-contrasena');
      await page.getByRole('button', { name: 'Ingresar' }).click();
      await expect(page.getByRole('button', { name: 'Ingresar' })).toBeEnabled();
    }
    await expect(page.getByRole('main').getByRole('alert')).toContainText('esperá 15 minutos');

    await ingresar(page, persona.email);
    await expect(page.getByRole('main').getByRole('alert')).toContainText('esperá 15 minutos');
  });
});

test.describe('RF-006 y RNF-014 — recuperar la contraseña', () => {
  test('pide el enlace, define la nueva y el enlace no sirve dos veces', async ({ page }) => {
    const persona = await cuentaActiva(page);

    await page.goto('/recuperar');
    await sinFallasDeAccesibilidad(page);
    await page.getByLabel('Mail').fill(persona.email);
    await page.getByRole('button', { name: 'Mandar enlace' }).click();
    await expect(page.getByText(/te mandamos el enlace/)).toBeVisible();

    const enlace = await enlaceDelMail(persona.email, asuntoRecuperacion);
    await page.goto(enlace);
    await page.getByLabel('Contraseña nueva').fill('otra-contrasena-nueva');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.getByText(/cambiaste la contraseña/)).toBeVisible();

    await page.goto('/');
    await page.goto(enlace);
    await page.getByLabel('Contraseña nueva').fill('una-tercera-contrasena');
    await page.getByRole('button', { name: 'Guardar contraseña' }).click();
    await expect(page.getByRole('main').getByRole('alert')).toHaveText(
      'El enlace venció o no es válido.',
    );

    await ingresar(page, persona.email, 'otra-contrasena-nueva');
    await expect(
      page.getByRole('heading', { name: `Hola, ${persona.nombreUsuario}` }),
    ).toBeVisible();
  });
});

test.describe('RNF-020 — sin scroll horizontal desde 360 px', () => {
  for (const ruta of [
    '/registro',
    '/ingresar',
    '/recuperar',
    '/verificar',
    '/privacidad',
  ] as const) {
    test(ruta, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto(ruta);
      const desborde = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(desborde).toBe(0);
    });
  }
});
