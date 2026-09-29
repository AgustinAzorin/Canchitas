import { react } from '@canchitas/eslint-config/react';
import next from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: [
      '.next/**',
      'storybook-static/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
  ...react({ tsconfigRootDir: import.meta.dirname }),
  next.configs['core-web-vitals'],
  reactHooks.configs.flat['recommended-latest'],
];
