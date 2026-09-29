import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/**/*.test.ts'],
          exclude: ['test/**/*.integration.test.ts'],
        },
      },
      {
        // Contra Postgres real con Testcontainers (ADR 0014): necesita Docker.
        test: {
          name: 'integration',
          include: ['test/**/*.integration.test.ts'],
          testTimeout: 60_000,
          hookTimeout: 300_000,
        },
      },
    ],
  },
});
