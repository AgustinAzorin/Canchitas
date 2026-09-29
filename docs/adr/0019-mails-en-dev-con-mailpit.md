# 0019 — Mails de dev y de los E2E con Mailpit

- **Estado:** Propuesta
- **Fecha:** 2026-09-29

## Contexto

RF-001, RF-004 y RF-006 dependen de mails: sin leer el enlace de verificación o de recuperación no se puede probar el flujo de cuentas de punta a punta (ADR 0014). El proveedor de producción sigue abierto (TBD-09) y la API manda por SMTP con Nodemailer (ADR 0009), así que en dev y en CI hace falta un servidor SMTP que no entregue a nadie y deje leer lo que recibe.

## Decisión

- **Mailpit** como servicio `mailpit` de `infra/compose/docker-compose.yml`: SMTP en el puerto 1025 e interfaz y API HTTP en el 8025, los dos solo en la máquina local.
- La API no sabe que es Mailpit: se configura con las mismas variables `SMTP_*` que en staging y prod. En dev apuntan a `localhost:1025` (`apps/api/dev.env`).
- Los E2E de Playwright leen los enlaces de los mails con la API de Mailpit (`GET /api/v1/search`, `GET /api/v1/message/{id}`).
- Mailpit no se despliega en staging ni en prod.

## Consecuencias

- Los flujos con mails se prueban completos en local y en CI, sin cuentas ni costos de un proveedor.
- Elegir el proveedor (TBD-09) solo cambia variables de entorno.
- Mailpit no valida lo que valida un proveedor real (SPF, DKIM, reputación, límites del plan gratuito): eso se prueba en staging cuando se resuelva TBD-09.
