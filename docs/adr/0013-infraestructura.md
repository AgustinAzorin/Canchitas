# 0013 — Infraestructura en un VPS con Docker Compose

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

RES-02 fija un costo de operación de USD 25 por mes o menos. Hacen falta un proceso siempre encendido (worker), backups diarios (RNF-006 a RNF-008) y 99% de disponibilidad (RNF-004).

## Decisión

- **Un VPS** con Docker Compose:
  - `postgis/postgis:16`;
  - `api` y `worker` (misma imagen, distinto comando);
  - `web` (Next.js standalone);
  - `caddy` (proxy y HTTPS automático).
- **Tres ambientes:** `dev` (local con Docker Compose), `staging` y `prod`. Staging es otro proyecto de Compose en el mismo VPS.
- **Infraestructura como código con OpenTofu:** VPS, DNS y buckets de R2.
- **Secretos cifrados en el repo con SOPS + age.** Nunca en texto plano ni en variables de CI sueltas.
- **Backups:** `pg_dump` diario a R2 con retención definida, y un restore de prueba automático semanal en staging.
- **CI/CD con GitHub Actions:**
  1. lint, tests y verificación de contrato;
  2. build de imágenes a GHCR;
  3. deploy a staging automático desde `main`;
  4. deploy a prod por tag, que corre `dbmate up` con el rol migrator antes de reiniciar los servicios.

## Consecuencias

- La web no usa Vercel: evita la restricción no comercial del plan gratuito y queda todo en un solo lugar.
- Hay que mantener el servidor (actualizaciones de seguridad, monitoreo). Se automatiza con unattended-upgrades y el monitoreo del ADR 0015.
