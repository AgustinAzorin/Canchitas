import { defineConfig, devices } from '@playwright/test';

// En entornos con un Chromium propio (por ejemplo, contenedores con navegador preinstalado).
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];
const navegador = {
  ...devices['Desktop Chrome'],
  ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
};

export default defineConfig({
  forbidOnly: process.env['CI'] !== undefined,
  reporter: process.env['CI'] === undefined ? 'list' : [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      // Contra el stack local: Postgres y Caddy de infra/compose, API y web (pnpm dev o CI).
      name: 'e2e',
      testDir: 'e2e',
      testIgnore: 'visual/**',
      use: { ...navegador, baseURL: 'http://localhost:8080' },
    },
    {
      // Una captura por story de Storybook (ADR 0010). Necesita `pnpm build-storybook`.
      name: 'visual',
      testDir: 'e2e/visual',
      use: { ...navegador, baseURL: 'http://localhost:6007' },
      expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
    },
  ],
  webServer: [
    {
      command: 'pnpm exec vite preview --outDir storybook-static --port 6007 --strictPort',
      url: 'http://localhost:6007/index.json',
      reuseExistingServer: true,
    },
  ],
});
