// Grupos de punta a punta en la web contra el stack local (RF-010, RF-011, RF-012, RN-26, RN-27,
// RNF-019, RNF-020). Cada persona tiene su propio contexto del navegador, con su sesión.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Browser, type Page } from '@playwright/test';

import { enlaceDelMail } from './mailpit';

const asuntoVerificacion = 'Verificá tu mail en Canchitas';
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

/** Cuenta creada por la API; verificada salvo que se pida lo contrario. */
async function cuenta(page: Page, verificada = true) {
  const persona = personaNueva();
  const alta = await page.request.post('/v1/cuentas', {
    data: { ...persona, contrasena, fechaNacimiento: '1990-01-01', aceptaPrivacidad: true },
  });
  expect(alta.status()).toBe(201);
  if (verificada) {
    await page.goto(await enlaceDelMail(persona.email, asuntoVerificacion));
    await expect(page.getByText('Listo, tu cuenta está activa.')).toBeVisible();
  }
  return persona;
}

async function completarIngreso(page: Page, email: string) {
  await page.getByLabel('Mail').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(contrasena);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

/** Inicia sesión desde /ingresar y espera a estar en el inicio con la sesión. */
async function ingresar(page: Page, persona: { email: string; nombreUsuario: string }) {
  await page.goto('/ingresar');
  await completarIngreso(page, persona.email);
  await expect(page.getByRole('heading', { name: `Hola, ${persona.nombreUsuario}` })).toBeVisible();
}

async function nuevaPagina(browser: Browser): Promise<Page> {
  const contexto = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  return contexto.newPage();
}

async function crearGrupo(page: Page, nombre: string): Promise<string> {
  await page.goto('/');
  await page.getByLabel('Nombre del grupo').fill(nombre);
  await page.getByRole('button', { name: 'Crear grupo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: nombre })).toBeVisible();
  const link = await page.getByText(/\/i\/[A-Za-z0-9_-]+$/).textContent();
  expect(link).not.toBeNull();
  return new URL(link ?? '').pathname;
}

test.describe('RF-010, RF-011 y RF-012 — grupos de punta a punta', () => {
  // Varias personas, cada una con su cuenta y su mail: más largo que un test de una pantalla.
  test.describe.configure({ timeout: 90_000 });

  test('crear un grupo, unirse por link sin sesión y regenerar el link', async ({ browser }) => {
    // RF-010: Ana crea el grupo y queda como admin, con el link de invitación.
    const ana = await nuevaPagina(browser);
    const datosDeAna = await cuenta(ana);
    await ingresar(ana, datosDeAna);
    const link = await crearGrupo(ana, 'Los del jueves');
    await expect(ana.getByText('1 miembro · Tu rol: Admin')).toBeVisible();
    await ana.getByRole('button', { name: 'Copiar link' }).click();
    await expect(ana.getByText('Link copiado.')).toBeVisible();
    await sinFallasDeAccesibilidad(ana);

    // RN-27: Beto abre el link sin sesión y no ve nada del grupo.
    const beto = await nuevaPagina(browser);
    const datosDeBeto = await cuenta(beto);
    await beto.context().clearCookies();
    await beto.goto(link);
    await expect(
      beto.getByText('Iniciá sesión o creá una cuenta para unirte al grupo.'),
    ).toBeVisible();
    await expect(beto.getByText('Los del jueves')).toHaveCount(0);
    await sinFallasDeAccesibilidad(beto);

    // Inicia sesión y vuelve al link para unirse (RF-011).
    await beto.getByRole('link', { name: 'Iniciar sesión' }).click();
    await completarIngreso(beto, datosDeBeto.email);
    await expect(beto).toHaveURL(new RegExp(`${link}$`));
    await expect(beto.getByRole('heading', { name: 'Los del jueves' })).toBeVisible();
    await sinFallasDeAccesibilidad(beto);
    await beto.getByRole('button', { name: 'Unirme al grupo' }).click();

    // RN-26: como jugador no ve el link ni puede regenerarlo.
    await expect(beto.getByRole('heading', { level: 1, name: 'Los del jueves' })).toBeVisible();
    await expect(beto.getByText('2 miembros · Tu rol: Jugador')).toBeVisible();
    await expect(beto.getByText(link)).toHaveCount(0);
    await expect(beto.getByRole('button', { name: 'Regenerar link' })).toHaveCount(0);

    // RF-011: si vuelve a abrir el link, va al grupo sin duplicar la membresía.
    await beto.goto(link);
    await expect(beto).toHaveURL(/\/grupos\/[0-9a-f-]+$/);
    await expect(beto.getByText('2 miembros · Tu rol: Jugador')).toBeVisible();

    // RF-012: Ana regenera el link; el anterior deja de funcionar.
    await ana.reload();
    await ana.getByRole('button', { name: 'Regenerar link' }).click();
    await expect(ana.getByText(/El link actual va a dejar de funcionar/)).toBeVisible();
    await ana.getByRole('button', { name: 'Sí, regenerar' }).click();
    await expect(
      ana.getByText('Listo, generamos un link nuevo. El anterior ya no sirve.'),
    ).toBeVisible();
    await expect(ana.getByText(link)).toHaveCount(0);

    const caro = await nuevaPagina(browser);
    const datosDeCaro = await cuenta(caro);
    await ingresar(caro, datosDeCaro);
    await caro.goto(link);
    await expect(caro.getByRole('main').getByRole('alert')).toHaveText(
      'Este link de invitación ya no es válido. Pedile el link nuevo a un admin.',
    );
  });

  test('RF-004: sin verificar el mail no se une y se le ofrece reenviarlo', async ({ browser }) => {
    const ana = await nuevaPagina(browser);
    const datosDeAna = await cuenta(ana);
    await ingresar(ana, datosDeAna);
    const link = await crearGrupo(ana, 'Fútbol de los martes');

    const dani = await nuevaPagina(browser);
    const datosDeDani = await cuenta(dani, false);
    await dani.goto(link);
    await dani.getByRole('link', { name: 'Iniciar sesión' }).click();
    await completarIngreso(dani, datosDeDani.email);

    await expect(dani.getByText(/Para unirte tenés que verificar tu mail/)).toBeVisible();
    await expect(dani.getByRole('button', { name: 'Unirme al grupo' })).toHaveCount(0);
    await dani.getByRole('button', { name: 'Reenviar mail' }).click();
    await expect(dani.getByText(/te mandamos un enlace nuevo/)).toBeVisible();
    await sinFallasDeAccesibilidad(dani);
  });

  test('RN-27: quien se registra desde el link vuelve a él al iniciar sesión', async ({
    browser,
  }) => {
    const ana = await nuevaPagina(browser);
    const datosDeAna = await cuenta(ana);
    await ingresar(ana, datosDeAna);
    const link = await crearGrupo(ana, 'Los nuevos');

    const eli = await nuevaPagina(browser);
    const datosDeEli = personaNueva();
    await eli.goto(link);
    await eli.getByRole('link', { name: 'Crear cuenta' }).click();
    await eli.getByLabel('Mail').fill(datosDeEli.email);
    await eli.getByLabel('Contraseña', { exact: true }).fill(contrasena);
    await eli.getByLabel('Nombre de usuario').fill(datosDeEli.nombreUsuario);
    await eli.getByLabel('Fecha de nacimiento').fill('1995-05-20');
    await eli.getByLabel(/Leí y acepto/).check();
    await eli.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(eli.getByRole('heading', { name: 'Revisá tu mail' })).toBeVisible();

    const verificacion = await nuevaPagina(browser);
    await verificacion.goto(await enlaceDelMail(datosDeEli.email, asuntoVerificacion));
    await expect(verificacion.getByText('Listo, tu cuenta está activa.')).toBeVisible();

    await eli.getByRole('link', { name: 'Ir a iniciar sesión' }).click();
    await expect(eli).toHaveURL(/\/ingresar\?invitacion=/);
    await completarIngreso(eli, datosDeEli.email);
    await expect(eli).toHaveURL(new RegExp(`${link}$`));
    await eli.getByRole('button', { name: 'Unirme al grupo' }).click();
    await expect(eli.getByText('2 miembros · Tu rol: Jugador')).toBeVisible();
  });

  test('RNF-020: el grupo y la invitación no tienen scroll horizontal a 360 px', async ({
    browser,
  }) => {
    const ana = await nuevaPagina(browser);
    await ana.setViewportSize({ width: 360, height: 740 });
    const datosDeAna = await cuenta(ana);
    await ingresar(ana, datosDeAna);
    const link = await crearGrupo(ana, 'Un nombre de grupo bastante largo para probar el ancho');
    const sinScroll = () =>
      ana.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(await sinScroll()).toBe(true);
    await ana.goto(link);
    expect(await sinScroll()).toBe(true);
  });
});

test('RF-011 — assetlinks.json declara la app para los App Links', async ({ request }) => {
  const respuesta = await request.get('/.well-known/assetlinks.json');

  expect(respuesta.status()).toBe(200);
  expect(respuesta.headers()['content-type']).toContain('application/json');
  expect(await respuesta.json()).toEqual([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.canchitas.app',
        sha256_cert_fingerprints: [
          '48:1A:F3:55:A8:05:07:88:58:3C:F2:D4:3C:E4:00:44:0B:4E:E5:E2:0E:ED:24:B0:20:A7:17:98:47:B1:38:0E',
        ],
      },
    },
  ]);
});
