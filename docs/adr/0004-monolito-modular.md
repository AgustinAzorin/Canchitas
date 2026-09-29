# 0004 — Monolito modular con puertos y adaptadores

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

El volumen previsto (RD-007) no justifica servicios separados. Las reglas de negocio (partidos, votaciones, pagos, calificaciones) son el núcleo del producto y tienen que poder probarse sin base de datos ni HTTP.

## Decisión

La API es un monolito modular. Hay un módulo por contexto: `cuentas`, `grupos`, `votaciones`, `partidos`, `estadisticas`, `pagos`, `canchas`, `moderacion`, `calificaciones`, `notificaciones`, `plataforma`.

Cada módulo tiene cuatro capas, y las dependencias van solo hacia adentro:

| Capa | Contiene | Puede depender de |
|---|---|---|
| `domain` | Entidades, value objects, reglas, eventos de dominio. TypeScript puro, sin I/O. | nada |
| `application` | Casos de uso (un comando por archivo), puertos (interfaces de repositorios y servicios), query services | `domain` |
| `infrastructure` | Adaptadores: repositorios con Kysely, pg-boss, FCM, mail, R2 | `application`, `domain` |
| `http` | Rutas de Fastify, esquemas zod, mapeo a DTOs | `application` |

- **Escrituras** por el dominio: el caso de uso carga el agregado, aplica la regla y persiste.
- **Lecturas** directo a las vistas SQL con query services, sin pasar por el dominio.
- **Entre módulos:** solo por la API pública del módulo (`index.ts`) o por eventos de dominio publicados en el outbox (ADR 0006). Nunca importando internals de otro módulo.
- **Inyección de dependencias manual** en una raíz de composición (`src/main.ts` y `src/composition/`). Sin contenedor ni decoradores.
- **Unit of work:** cada caso de uso corre en una transacción. El evento de outbox y el registro de auditoría se escriben en esa misma transacción.
- **Rigor proporcional:** los módulos con reglas (partidos, votaciones, pagos, calificaciones, grupos) usan las cuatro capas completas. Los CRUD simples (preferencias de notificación, contactos) pueden ir de `http` a un query o command service sin entidades de dominio. Lo que no se hace es saltear capas en sentido contrario.

Los límites se verifican en CI con dependency-cruiser.

## Consecuencias

- El dominio se prueba con tests unitarios rápidos, sin base.
- Un módulo se podría extraer a un servicio si algún día hiciera falta, pero no es el objetivo.
- NestJS queda descartado: sus decoradores y su inyección por reflexión llegan hasta el dominio.
