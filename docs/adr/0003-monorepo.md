# 0003 — Monorepo

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

Hay cuatro piezas que cambian juntas: base de datos, API, web y Android. Un cambio de contrato toca las cuatro.

## Decisión

Un solo repositorio:

```
apps/api        API y worker (TypeScript, pnpm)
apps/web        Web (Next.js, pnpm)
apps/android    App Android (Gradle, fuera de pnpm)
packages/*      Código TypeScript compartido (configuraciones de lint y tsconfig, cliente generado)
contract/       openapi.json generado por la API, versionado
db/             migraciones, tests pgTAP, schema.sql generado
infra/          OpenTofu, Docker Compose, Caddy
docs/           SRS, ADRs, modelo de datos, design system, hoja de ruta
```

- pnpm workspaces para las piezas de TypeScript. Turborepo para orquestar tareas y caché.
- Android es un build de Gradle independiente que consume `contract/openapi.json`.
- Un cambio que cruza piezas (por ejemplo, un endpoint nuevo) va en un solo PR.

## Consecuencias

- El contrato generado se commitea: un cambio de API se ve en el diff.
- CI corre solo lo afectado por cada cambio (filtros de Turborepo y de rutas).
