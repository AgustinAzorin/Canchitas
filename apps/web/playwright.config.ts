import { defineConfig } from '@playwright/test';

import { navegador } from './playwright.comun';

// E2E contra el stack local: Postgres y Caddy de infra/compose, API y web (`pnpm dev` o CI).
export default defineConfig({
  testDir: 'e2e',
  testIgnore: 'visual/**',
  forbidOnly: process.env['CI'] !== undefined,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: { ...navegador, baseURL: 'http://localhost:8080' },
});
