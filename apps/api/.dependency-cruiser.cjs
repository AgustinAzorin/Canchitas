// Reglas de capas y de módulos del ADR 0004 (apps/api/CLAUDE.md). Corre en `pnpm lint` y en CI.
// Aplica a cualquier carpeta con capas: src/modules/<modulo>/… y piezas técnicas como src/salud/….
const capa = (nombre) => `^src/(?:modules/[^/]+|[^/]+)/${nombre}/`;

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-puro',
      comment: 'domain solo importa domain y shared/result: sin I/O, sin frameworks, sin reloj.',
      severity: 'error',
      from: { path: capa('domain') },
      to: {
        pathNot: [capa('domain'), '^src/shared/result\\.ts$'],
      },
    },
    {
      name: 'application-sin-adaptadores',
      comment: 'application define puertos; no conoce infrastructure ni http.',
      severity: 'error',
      from: { path: capa('application') },
      to: { path: [capa('infrastructure'), capa('http')] },
    },
    {
      name: 'application-sin-frameworks',
      comment: 'application no importa Kysely, pg, Fastify ni zod.',
      severity: 'error',
      from: { path: capa('application') },
      to: { dependencyTypes: ['npm'], pathNot: ['node_modules/neverthrow/'] },
    },
    {
      name: 'infrastructure-sin-http',
      severity: 'error',
      from: { path: capa('infrastructure') },
      to: { path: capa('http') },
    },
    {
      name: 'http-solo-application',
      comment:
        'http valida, llama al caso de uso y mapea el resultado; no toca adaptadores ni dominio.',
      severity: 'error',
      from: { path: capa('http') },
      to: { path: [capa('infrastructure'), capa('domain')] },
    },
    {
      name: 'sql-solo-en-infrastructure',
      comment: 'Kysely y pg solo en infrastructure, shared/db y la raíz de composición.',
      severity: 'error',
      from: {
        path: '^src/',
        pathNot: [capa('infrastructure'), '^src/shared/db/', '^src/composition/'],
      },
      to: { path: ['node_modules/kysely/', 'node_modules/pg/'] },
    },
    {
      name: 'modulos-por-su-index',
      comment: 'Entre módulos solo por la API pública (index.ts) o por eventos del outbox.',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/([^/]+)/',
        pathNot: ['^src/modules/$1/', '^src/modules/[^/]+/index\\.ts$'],
      },
    },
    {
      name: 'sin-ciclos',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
