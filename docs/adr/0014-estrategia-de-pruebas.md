# 0014 — Estrategia de pruebas

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Decisión

| Nivel | Qué prueba | Herramienta |
|---|---|---|
| Base | Triggers, constraints, vistas con lógica | pgTAP + pg_prove |
| Dominio | Reglas de negocio puras | Vitest; **fast-check** para reglas con aritmética o secuencias (costos, lista de espera, empates) |
| Casos de uso | Orquestación con puertos falsos en memoria | Vitest |
| Integración | Adaptadores y endpoints contra Postgres real | Vitest + **Testcontainers** (imagen PostGIS) |
| Contrato | Respuestas que cumplen el OpenAPI; cambios incompatibles | validación contra el esquema + oasdiff |
| Autorización | Matriz completa rol × acción (RN-07, RNF-013) | Vitest, tabla generada |
| Web | Componentes y flujos | Storybook + Playwright |
| Android | ViewModels, repositorios, UI | JUnit + Turbine, Compose UI tests, Roborazzi |
| Calidad de los tests del dominio | Que los tests atrapen errores | **Stryker** (mutation testing), solo sobre `domain` |

- **Los tests llevan el ID del requisito** que verifican: `describe('RF-038 — ofrecer el lugar a la lista de espera', …)`. Cada criterio de aceptación del SRS es al menos un test.
- **Un bug se arregla con un test que lo reproduce primero.**
- **Umbrales en CI:** cobertura de líneas ≥ 90% y mutation score ≥ 80% en `domain`. Nada de umbrales globales que inviten a tests vacíos.
- **Sin mocks de la base** para probar SQL: para eso está Testcontainers.

## Consecuencias

- Un requisito sin test no se considera implementado (ver `docs/ROADMAP.md`).
