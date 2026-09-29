# 0001 — Registrar las decisiones de arquitectura en ADRs

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

El código lo escribe mayormente Claude, en sesiones que no recuerdan las anteriores. Una decisión que no está escrita se puede deshacer sin querer en la próxima sesión.

## Decisión

Toda decisión de arquitectura, de tecnología o de convención que afecte a más de un archivo se registra en `docs/adr/` con la plantilla `0000-plantilla.md`. Los ADRs no se editan después de aceptados: si una decisión cambia, se escribe un ADR nuevo que reemplaza al anterior y se marca el viejo como "Reemplazada por NNNN".

## Consecuencias

- Antes de cambiar algo que un ADR decidió, hay que escribir el ADR que lo reemplaza.
- Los `CLAUDE.md` resumen las reglas; los ADRs guardan el porqué.
