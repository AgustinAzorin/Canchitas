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

Se completan en el hito M0, cuando exista el tooling. Todo comando del repo se corre desde la raíz con `pnpm` (o `./gradlew` dentro de `apps/android`).
