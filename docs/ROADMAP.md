# Hoja de ruta

Orden de construcción de Canchitas. Cada hito se trabaja en una o más ramas y PRs, y se da por terminado cuando cumple su **criterio de hecho**. Al cerrar un hito, se marcan sus casillas y se anota el PR.

**Definición de "hecho" para cualquier requisito:**
- implementado en API, web y Android, salvo que el requisito diga otra cosa (el panel de admin de plataforma es solo web);
- tests con el ID del requisito en cada capa que corresponda;
- contrato OpenAPI regenerado;
- sin errores de lint ni de tipos.

---

## M0 — Cimientos

Sin funcionalidades. El repo queda listo para construir.

- [ ] Monorepo: pnpm workspaces, Turborepo, `packages/tsconfig` y `packages/eslint-config` (strict-type-checked), Prettier, `.editorconfig`.
- [ ] `apps/api`: Fastify + zod + OpenAPI; `GET /v1/salud`; Kysely con tipos generados de la base; logger pino; raíz de composición; `Result` y `problem+json` en `shared/`; dependency-cruiser con las reglas de capas del ADR 0004.
- [ ] `apps/web`: Next.js + Tailwind v4 + shadcn/ui; tokens exportados desde `docs/design-system/tokens.json`; Storybook; Playwright; cliente generado del contrato; página que muestra `/v1/salud`.
- [ ] `apps/android`: estructura de Now in Android (build-logic, version catalog, módulos `core:*`); `core:designsystem` desde los tokens; cliente generado; pantalla que muestra `/v1/salud`; detekt, ktlint, Roborazzi.
- [ ] `db`: roles `canchitas_migrator`, `canchitas_api`, `canchitas_worker`, `canchitas_readonly` en una migración nueva.
- [ ] `infra`: `docker-compose.yml` para dev (Postgres con PostGIS y pgTAP, API, worker, web); Caddy; esqueleto de OpenTofu; SOPS + age.
- [ ] CI en GitHub Actions: lint, tipos, tests (Vitest, pgTAP, Android), squawk, contrato al día, oasdiff, dependency-cruiser, gitleaks, CodeQL, commitlint. Renovate configurado.
- [ ] `CLAUDE.md` raíz: sección **Comandos** completa.

**Hecho cuando:** `pnpm dev` levanta todo local; la web y la app muestran el estado de la API; CI en verde.

## M1 — Esqueleto de punta a punta: cuentas y grupos

- [ ] Better Auth: migraciones de sus tablas, mapeo a `usuario`, cookies web, bearer en Android.
- [ ] RF-001 a RF-007, RN-20, RNF-009, RNF-011, RNF-012, RNF-014, RNF-018.
- [ ] RF-010, RF-011, RF-012 (crear grupo, unirse por link, regenerar link), con App Links en Android.
- [ ] Módulo de políticas de autorización con su matriz de tests (RN-07, RNF-013).
- [ ] Deploy a staging en el VPS; backup diario a R2 y restore de prueba.

**Hecho cuando:** alguien se registra en Android, crea un grupo, comparte el link, otra persona se une desde la web, y todo corre en staging.

## M2 — Grupos completos, notificaciones y cuenta

- [ ] RF-013 a RF-018 (agregar por nombre de usuario, admins, varios grupos, salir, expulsar, borrar grupo). Decidir antes qué pasa si el creador borró su cuenta (ver MODELO.md, "Pendiente").
- [ ] Outbox + worker + pg-boss (ADR 0006).
- [ ] RF-100, RF-101 (push por FCM y bandeja), RF-103, RF-104.
- [ ] RF-008 (borrar cuenta, RN-21, RNF-015).
- [ ] Auditoría de acciones de admin (TBD-08).

## M3 — Directorio de canchas

- [ ] PMTiles de AMBA en R2 y estilo del mapa (ADR 0012).
- [ ] RF-070 a RF-078 (mapa, lista, filtros, distancia, ficha, llamar, WhatsApp, contactos, proponer).
- [ ] RF-095 a RF-097 (carga, edición y aprobación en `/admin`), con geocodificación por Nominatim.
- [ ] TBD-10: precarga de canchas antes del test cerrado.

## M4 — Votaciones

- [ ] RF-020 a RF-025, RN-06, RF-041 (compartir por WhatsApp).
- [ ] Jobs: cierre automático y notificación del resultado.

## M5 — Partidos y convocatoria

- [ ] RF-030 a RF-040 (partido único, series, apertura, saltear, modificar serie, confirmar, lista de espera, bajas, oferta de lugar, antelación, cupo incompleto).
- [ ] RF-102 (recordatorios).
- [ ] TBD-12 resuelto antes de implementar RF-038.

## M6 — Equipos, resultados y estadísticas

- [ ] RF-045 a RF-052.

**Hecho cuando** el MVP (todos los Must) está completo. Siguiente paso: test cerrado de Google Play (DEP-01).

## M7 — Should

- [ ] Avales y figura: RF-055 a RF-060.
- [ ] Costos: RF-065 a RF-068 (TBD-06).
- [ ] Reseñas, reportes y denuncias: RF-079, RF-080, RF-085 a RF-087, RF-098.
- [ ] Complejos: RF-090 a RF-092.
- [ ] Invitados: RF-110 a RF-112 (ADR 0016).
- [ ] Métricas: RF-099.

## M8 — Could

- [ ] Radar, calificaciones y notas: RF-120 a RF-128.

## M9 — Lanzamiento

- [ ] Prueba de carga: 200 usuarios concurrentes (RNF-001, RNF-003, RNF-024).
- [ ] Auditoría de accesibilidad (RNF-019).
- [ ] Prueba de restauración de backup en producción (RNF-007, RNF-008).
- [ ] Monitoreo de disponibilidad (RNF-004).
- [ ] Política de privacidad publicada (RNF-018, RES-07).

---

## Decisiones pendientes que bloquean algo

| Pendiente | Bloquea |
|---|---|
| Actualizar RF-110 en el SRS (ADR 0016) | M7, invitados |
| Qué pasa con un grupo cuyo creador borró su cuenta | M2, RF-018 |
| TBD-04 fotos de canchas | M3, RF-074 |
| TBD-06 redondeo | M7, costos |
| TBD-09 proveedor de mails | M1 |
| TBD-10 precarga de canchas | M6, test cerrado |
| TBD-12 plazo de la lista de espera sobre la hora | M5, RF-038 |
