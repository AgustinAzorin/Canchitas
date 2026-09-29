import { defineConfig } from '@playwright/test';

import { navegador } from './playwright.comun';

// Una captura y axe por story de Storybook (ADR 0010). Necesita `pnpm build-storybook`.
export default defineConfig({
  testDir: 'e2e/visual',
  forbidOnly: process.env['CI'] !== undefined,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: { ...navegador, baseURL: 'http://localhost:6007' },
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  webServer: {
    command: 'npx vite preview --outDir storybook-static --port 6007 --strictPort',
    url: 'http://localhost:6007/index.json',
    reuseExistingServer: true,
  },
});
