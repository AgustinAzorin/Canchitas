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

- [x] Monorepo: pnpm workspaces, Turborepo, `packages/tsconfig` y `packages/eslint-config` (strict-type-checked), Prettier, `.editorconfig`.
- [x] `apps/api`: Fastify + zod + OpenAPI; `GET /v1/salud`; Kysely con tipos generados de la base; logger pino; raíz de composición; `Result` y `problem+json` en `shared/`; dependency-cruiser con las reglas de capas del ADR 0004.
- [x] `apps/web`: Next.js + Tailwind v4 + shadcn/ui; tokens exportados desde `docs/design-system/tokens.json`; Storybook; Playwright; cliente generado del contrato; página que muestra `/v1/salud`.
- [x] `apps/android`: estructura de Now in Android (build-logic, version catalog, módulos `core:*`); `core:designsystem` desde los tokens; cliente generado; pantalla que muestra `/v1/salud`; detekt, ktlint, Roborazzi.
  - Pendiente: reglas de Compose en detekt (ADR 0011). La versión de compose-rules compatible con Kotlin 2.4 exige detekt 2.0, que todavía es alpha.
  - `core:database` y `core:ui` se crean cuando haya datos que guardar y componentes compartidos (M1).
- [x] `db`: roles `canchitas_migrator`, `canchitas_api`, `canchitas_worker`, `canchitas_readonly` en una migración nueva.
- [x] `infra`: `docker-compose.yml` para dev (Postgres con PostGIS y pgTAP, API, worker, web); Caddy; esqueleto de OpenTofu; SOPS + age.
  - `.sops.yaml` sin claves: la clave pública age y el proveedor del VPS se definen en M1, con el deploy a staging.
- [x] CI en GitHub Actions: lint, tipos, tests (Vitest, pgTAP, Android), squawk, contrato al día, oasdiff, dependency-cruiser, gitleaks, CodeQL, commitlint. Renovate configurado. En verde en `main`.
- [x] `CLAUDE.md` raíz: sección **Comandos** completa.

**Hecho cuando:** `pnpm dev` levanta todo local; la web y la app muestran el estado de la API; CI en verde.

**Estado:** `pnpm dev` levanta todo y la web muestra `/v1/salud` (Playwright). La app lo muestra en Robolectric contra la API local (`SaludContraApiLocalTest`). CI en verde en `main`. Falta solo probar la app en un emulador o un teléfono.

## M1 — Esqueleto de punta a punta: cuentas y grupos

- [x] Better Auth: migraciones de sus tablas, mapeo a `usuario`, cookies web, bearer en Android (PR `feat/m1-cuentas`).
- [x] RF-001 a RF-007, RN-20, RNF-009, RNF-011, RNF-012, RNF-014, RNF-018 en API, web y Android (PR `feat/m1-cuentas`).
  - Mails por SMTP con Nodemailer; en dev y E2E, Mailpit (ADR 0019). El proveedor real sigue abierto (TBD-09).
  - La política de privacidad es un texto provisorio hasta M9.
  - RF-004, segundo criterio (no unirse a un grupo sin verificar): se prueba con RF-011.
  - Los enlaces de los mails abren la web también desde Android; los App Links llegan con RF-011.
  - Pendiente: `Idempotency-Key` (ADR 0007) y rate limiting por IP (ADR 0015) en los endpoints de cuentas.
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
| TBD-09 proveedor de mails | M1, deploy a staging |
| TBD-10 precarga de canchas | M6, test cerrado |
| TBD-12 plazo de la lista de espera sobre la hora | M5, RF-038 |
