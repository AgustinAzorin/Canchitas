# 0017 — Design tokens como fuente única

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Decisión

- `docs/design-system/tokens.json` es la única fuente de colores, tipografía, espaciado, radios, elevación y movimiento. `docs/design-system/GUIDELINES.md` define su uso.
- Un script exporta los tokens a `apps/web` (CSS de Tailwind v4, fuentes) y a `apps/android` (`core:designsystem`: Color, Type, Shape, Theme). Los archivos generados no se editan a mano; CI verifica que estén al día.
- El contraste WCAG AA (RNF-019) se verifica en CI sobre `tokens.json`.
- En pantallas se usan roles semánticos (`primary`, `warning`), nunca primitivos (`brand-500`).

## Consecuencias

- Cambiar un color es cambiar `tokens.json` y regenerar; nada más.
