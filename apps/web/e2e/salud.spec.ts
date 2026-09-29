import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('M0 — la web muestra el estado de la API', () => {
  test('la página de inicio muestra que la API está en línea', async ({ page }) => {
    await page.goto('/');

    const estado = page.getByRole('status');
    await expect(estado).toContainText('La API está en línea.');
    await expect(estado.locator('time')).toHaveText(/^\S+ \d{2}\/\d{2} · \d{2}:\d{2}$/);
  });

  test('la página de inicio no tiene fallas de accesibilidad (RNF-019)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('status')).toContainText('La API está en línea.');

    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(resultado.violations).toEqual([]);
  });

  test('sin scroll horizontal desde 360 px (RNF-020)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/');

    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );

    expect(desborde).toBe(0);
  });
});
