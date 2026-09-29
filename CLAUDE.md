# CLAUDE.md — Canchitas

App web y Android para que grupos de amigos organicen sus partidos de fútbol (votaciones, confirmaciones, equipos, resultados, estadísticas, costos) y encuentren canchas. Solo Argentina, solo español rioplatense.

## Fuentes de verdad

Leé lo que corresponda antes de escribir código. Si dos fuentes se contradicen, gana la de más arriba y avisá la contradicción:

1. `docs/srs/SRS.md` — qué tiene que hacer el sistema. Los requisitos tienen ID (`RF-035`, `RN-04`, `RNF-013`).
2. `docs/adr/` — cómo y por qué está construido. `docs/adr/README.md` es el índice.
3. `docs/modelo-datos/MODELO.md` y `db/migrations/` — el modelo de datos.
4. `contract/openapi.json` — el contrato de la API (generado).
5. `docs/design-system/tokens.json` y `GUIDELINES.md` — cómo se ve y se escribe la interfaz.
6. `docs/ROADMAP.md` — en qué orden se construye y qué está hecho.

## Estructura

```
apps/api        API y worker — Fastify, TypeScript (ver apps/api/CLAUDE.md)
apps/web        Web — Next.js (ver apps/web/CLAUDE.md)
apps/android    App Android — Kotlin, Compose (ver apps/android/CLAUDE.md)
packages/       Configuración y código TypeScript compartido
contract/       openapi.json generado por la API
db/             Migraciones (dbmate), tests (pgTAP), schema.sql (ver db/CLAUDE.md)
infra/          OpenTofu, Docker Compose, Caddy
docs/           SRS, ADRs, modelo de datos, design system, hoja de ruta
```

## Reglas que no se rompen

- **Nada se construye sin un requisito del SRS.** Si algo no está en el SRS, preguntá antes.
- **Una decisión de arquitectura nueva o distinta requiere un ADR** (`docs/adr/0000-plantilla.md`). No cambies algo que un ADR decidió sin escribir el ADR que lo reemplaza.
- **Las migraciones aplicadas no se editan.** Se agrega una nueva (`db/CLAUDE.md`).
- **La API es la única autoridad.** Web y Android no tienen reglas de negocio; validan solo para la experiencia.
- **El contrato se genera, los clientes se generan.** Nadie escribe a mano un cliente HTTP ni un tipo que ya sale del contrato o de la base.
- **Todo requisito implementado tiene tests que llevan su ID.** Un bug se arregla empezando por el test que lo reproduce.
- **Nombres del dominio en español, patrones técnicos en inglés** (ADR 0002). Textos visibles en archivos de recursos, nunca literales.
- **Fechas:** se guardan como instantes (`timestamptz`) y se muestran en `America/Argentina/Buenos_Aires`. **Plata:** enteros en pesos.
- **Datos personales:** nunca en logs, nunca el mail de un invitado en una respuesta, nunca la identidad de quien calificó (RNF-017).
- **Tipos estrictos:** sin `any`, sin `!` de TypeScript, sin `!!` de Kotlin, sin desactivar reglas de lint sin un comentario que diga por qué.

## Forma de trabajo

- Trabajá un hito de `docs/ROADMAP.md` por vez, en una rama `feat/<hito>-<tema>`, y abrí un PR. No se commitea a `main`.
- Commits con Conventional Commits: tipo en inglés, descripción en español (`feat(partidos): confirmar asistencia con lista de espera`).
- Al terminar una tarea: corré lint, tipos y tests de lo que tocaste; actualizá `docs/ROADMAP.md`; si cambió el contrato o el esquema, regenerá lo generado.
- Si una tarea necesita una decisión que no está en el SRS ni en los ADRs, **pará y preguntá**. No inventes reglas de negocio.
- Usá la última versión estable de cada dependencia al agregarla y dejala fijada en el lockfile.

## Comandos

Todo se corre desde la raíz con `pnpm` (Node 24.21.0 y pnpm 12.6.0, ver `.nvmrc` y `packageManager`), salvo Android, que usa `./gradlew` dentro de `apps/android` (JDK 21 y Android SDK 37). Hace falta Docker.

**Levantar todo en local** (web y API en http://localhost:8080, detrás de Caddy como en producción):

| Comando | Qué hace |
|---|---|
| `pnpm install` | Dependencias y hook de commitlint. |
| `pnpm dev` | Postgres en Docker, migraciones, Caddy, y API, worker y web con recarga en caliente. |
| `pnpm dev:docker` | Lo mismo, pero API, worker y web en contenedores con las imágenes de producción. `pnpm dev:stop` los frena. |

**Calidad** (lo que corre CI):

| Comando | Qué hace |
|---|---|
| `pnpm lint` | ESLint en todo el TypeScript y dependency-cruiser en la API (capas del ADR 0004). |
| `pnpm typecheck` | Tipos de todos los paquetes. |
| `pnpm test` | Tests de la API: unitarios y de integración con Testcontainers. `pnpm --filter @canchitas/api test:unit` corre solo los unitarios. |
| `pnpm format` / `pnpm format:check` | Prettier. |

**Generados** (no se editan a mano; CI falla si están desactualizados):

| Comando | Qué regenera |
|---|---|
| `pnpm generate` | `contract/openapi.json` desde las rutas de la API, el cliente de la web y los tokens. |
| `pnpm tokens` / `pnpm tokens:check` | CSS y fuentes de la web y el tema de Compose desde `docs/design-system/tokens.json`, con verificación de contraste AA. |
| `pnpm --filter @canchitas/api db:types` | Tipos de Kysely desde la base de dev (`db:types:check` los verifica). |

**Base de datos** (dbmate, pg_prove y pg_dump corren dentro del contenedor; ver `db/CLAUDE.md`):

| Comando | Qué hace |
|---|---|
| `pnpm db:up` | Levanta Postgres 16 + PostGIS + pgTAP en el puerto 5433. |
| `pnpm db:migrate` / `pnpm db:rollback` | Aplica o deshace migraciones en `canchitas` (y regenera `db/schema.sql`) y en `canchitas_test`. |
| `pnpm db:new <nombre>` | Crea una migración con el encabezado obligatorio. |
| `pnpm db:test` | Tests pgTAP. |
| `pnpm db:lint` | squawk y la convención de `SET LOCAL ROLE`. |
| `pnpm db:reset` | Borra el Postgres de dev con sus datos. |

**Web** (`pnpm --filter @canchitas/web <comando>`): `dev`, `build`, `storybook`, `build-storybook`, `test:visual` (una captura y axe por story, dentro de la imagen oficial de Playwright para que las capturas sean iguales en todas las máquinas; necesita `build-storybook`; `test:visual:update` las regraba) y `e2e` (Playwright con axe contra el stack de `pnpm dev`).

**Android** (dentro de `apps/android`):

| Comando | Qué hace |
|---|---|
| `./gradlew assembleDebug` | APK de debug, firmado con el keystore de debug del repo; apunta a `http://10.0.2.2:8080/` (la PC vista desde el emulador). Con un teléfono: `-Pcanchitas.apiUrl=http://<ip-de-la-pc>:8080/`. El dominio de los App Links del link de invitación sale de `-Pcanchitas.dominioDeLinks=<dominio>` (por defecto `canchitas.app`). |
| `./gradlew ktlintCheck detekt lint` | Estilo, análisis estático y Android Lint (advertencias como errores). `ktlintFormat` corrige el formato. |
| `./gradlew testDebugUnitTest` | Tests de JVM y Robolectric. Con `CANCHITAS_API_URL=http://localhost:8080/` también corre la app contra la API local. |
| `./gradlew recordRoborazziDebug` / `verifyRoborazziDebug` | Graba o verifica los screenshots de Roborazzi. |
| `./gradlew assembleRelease` | Build de release con R8. |
