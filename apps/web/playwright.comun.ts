import { devices } from '@playwright/test';

// En entornos con un Chromium propio (por ejemplo, contenedores con navegador preinstalado).
const executablePath = process.env['PLAYWRIGHT_CHROMIUM_EXECUTABLE'];

export const navegador = {
  ...devices['Desktop Chrome'],
  ...(executablePath === undefined ? {} : { launchOptions: { executablePath } }),
};
