# 0009 — Autenticación con Better Auth

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

RES-08 limita el acceso a mail y contraseña. Se necesita verificación de mail (RF-004), recuperación (RF-006), enlaces de un solo uso (RNF-014), bloqueo tras intentos fallidos (RNF-011), sesiones de 30 días en Android (RNF-012) y contraseñas con hash robusto (RNF-009).

## Decisión

- **Better Auth**, montado en la API, con su tabla de usuario mapeada a `usuario`.
- **Web:** sesión por cookie `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Android:** bearer token guardado en DataStore cifrado con Tink.
- **La autorización no es de Better Auth:** vive en el módulo de políticas de la API (ADR 0004), con una matriz rol × acción derivada de RN-07 y testeada completa.
- Mails transaccionales por SMTP con Nodemailer; el proveedor sigue abierto (TBD-09).

## Consecuencias

- Las tablas de sesión, cuenta y verificación las crea Better Auth en migraciones de dbmate propias (se generan con su CLI y se revisan como cualquier migración).
- Si RNF-011 no se cubre con su configuración, se implementa en la API.
