# CLAUDE.md — apps/web

Web de Canchitas. Next.js (App Router) + TypeScript + Tailwind v4. Decisiones: ADR 0002, 0007, 0010, 0017.

## Estructura

```
src/
  app/                   rutas de Next.js; solo composición de pantallas, sin lógica
    (app)/               pantallas de usuario logueado
    (auth)/              login, registro, verificación, recuperación
    admin/               panel del admin de plataforma (RF-095 a RF-099)
    i/[token]/           entrada por link de invitación (RF-011, RF-110)
  features/<feature>/    componentes, hooks y queries de cada feature
  components/ui/         componentes del design system (shadcn/ui adaptados)
  lib/api/               cliente generado desde contract/openapi.json (no se edita)
  lib/                   utilidades sin dominio (formato de fecha y moneda, etc.)
  messages/es-AR.ts      todos los textos visibles
```

## Reglas

- **Sin reglas de negocio.** La web muestra lo que la API decide; la validación de formularios es solo para la experiencia.
- **Datos con TanStack Query** sobre el cliente generado. Las query keys se definen por feature en un solo archivo. Las pantallas que muestran votos, confirmaciones o bajas hacen polling (RNF-002).
- **Errores de la API:** se muestran según el `type` del `problem+json`, con el texto de `messages/`.
- **Diseño:** solo roles semánticos de los tokens (`bg-primary`, `text-muted-foreground`), nunca primitivos ni colores sueltos. Un botón `primary` por pantalla. Cifras con `tabular-nums`. Ver `docs/design-system/GUIDELINES.md` antes de crear un componente.
- **Accesibilidad (RNF-019, WCAG 2.1 AA):** objetivos táctiles de 48 px, foco visible, el color nunca es el único canal, `aria-sort` en tablas ordenables. Se verifica con axe en los tests de Playwright.
- **Responsive (RNF-020):** sin scroll horizontal desde 360 px.
- **Fechas y plata:** `Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })` y `Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })`, centralizados en `lib/formato.ts`.
- **Textos:** todos en `messages/es-AR.ts`. Voseo, sin exclamaciones ni emojis (GUIDELINES).

## Tests

- Componentes del design system en Storybook, con tests visuales.
- Flujos críticos en Playwright, con el ID del requisito en el nombre.

## Nunca

- `fetch` a mano contra la API.
- Lógica de permisos que no venga de la API.
- `localStorage` para datos del usuario más allá de preferencias de interfaz.
