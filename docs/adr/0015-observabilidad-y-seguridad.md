# 0015 — Observabilidad y seguridad de la cadena de suministro

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Decisión

**Observabilidad**
- **OpenTelemetry** en API y worker: trazas, métricas y logs con el mismo ID de correlación, propagado desde los clientes con el header `traceparent`.
- **Logs estructurados** con pino. Nunca se loguean mails, tokens ni contraseñas; hay una lista de campos que se redactan.
- **Sentry** para errores en API, web y Android.
- **Monitor externo de disponibilidad** para medir RNF-004.
- El destino de las trazas y métricas (backend de OpenTelemetry) se elige dentro del presupuesto de RES-02.

**Seguridad**
- **Renovate** para dependencias, con automerge solo de parches con tests en verde.
- **CodeQL**, **gitleaks** (secretos) y **trivy** (imágenes) en CI.
- **Conventional Commits** verificados con commitlint. `main` protegida: todo entra por PR con CI en verde.
- Headers de seguridad y CSP estricta en la web, rate limiting en la API.

## Consecuencias

- Un error en producción se puede seguir desde la pantalla de Android hasta la consulta SQL.
