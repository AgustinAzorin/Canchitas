# 0006 — Estado derivado del tiempo, outbox y trabajos diferidos

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

Muchas reglas dependen del tiempo: cierre de votaciones (RF-022), apertura de confirmación (RN-05), recordatorios (RF-102), plazo de la lista de espera (RN-04), cierre de la votación de figura (RN-10). Las notificaciones (RN-25) salen de casi toda acción.

## Decisión

1. **El estado que depende del tiempo se calcula, no se guarda.** Una votación está abierta si `now() < cierra_en` (y no se cerró a mano). El estado del partido sale de `v_partido`. Si un job no corre, las reglas se siguen cumpliendo; lo único que se atrasa es un aviso.
2. **Outbox transaccional.** Cada caso de uso escribe sus eventos de dominio en la tabla `outbox` dentro de su transacción. El worker los consume, arma las notificaciones de la bandeja, aplica las preferencias de silencio (RF-103, RF-104) y manda push por FCM.
3. **pg-boss** para trabajos diferidos y periódicos, sobre el mismo Postgres (sin Redis). Los jobs se agendan a la hora exacta del evento: cierre de votación, apertura de confirmación, recordatorios de 24 h y 2 h, vencimiento de la oferta de lista de espera, cierre de figura, materialización de instancias de series.
4. **Todo handler es idempotente.** Puede correr dos veces o tarde sin efectos dobles: marca lo que ya hizo (`procesado_en`, restricciones `UNIQUE`).
5. **API y worker** son el mismo código con dos puntos de entrada (`main-api.ts`, `main-worker.ts`) y la misma imagen de Docker.

## Consecuencias

- No hay cron de Vercel ni tick por minuto.
- Cambiar la hora de un partido obliga a reagendar sus jobs; el caso de uso lo hace publicando un evento.
