import type { NextConfig } from 'next';

const config: NextConfig = {
  // La imagen de Docker se sirve en modo standalone (ADR 0010, ADR 0013); en dev y CI se usa
  // `next start`, que no funciona con esa salida.
  ...(process.env['NEXT_STANDALONE'] === '1' ? { output: 'standalone' as const } : {}),
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
};

export default config;
