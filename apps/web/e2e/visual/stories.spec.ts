import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

interface Indice {
  entries: Record<string, { id: string; type: string }>;
}

function leerIndice(): Indice {
  const contenido: unknown = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '..', 'storybook-static', 'index.json'), 'utf8'),
  );
  if (typeof contenido !== 'object' || contenido === null || !('entries' in contenido)) {
    throw new Error('storybook-static/index.json no tiene el formato esperado');
  }
  const { entries } = contenido;
  if (typeof entries !== 'object' || entries === null) {
    throw new Error('storybook-static/index.json no tiene entradas');
  }
  return { entries: Object.fromEntries(Object.entries(entries)) };
}

const stories = Object.values(leerIndice().entries).filter((entrada) => entrada.type === 'story');

for (const { id } of stories) {
  test(`story ${id}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${id}&viewMode=story`);
    await page.evaluate(() => document.fonts.ready);
    const raiz = page.locator('#storybook-root');

    await expect(raiz).toHaveScreenshot(`${id}.png`);

    const resultado = await new AxeBuilder({ page }).include('#storybook-root').analyze();
    expect(resultado.violations).toEqual([]);
  });
}
