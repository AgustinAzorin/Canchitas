# 0016 — Invitados identificados por mail verificado

- **Estado:** Propuesta — requiere actualizar RF-110 en el SRS
- **Fecha:** 2026-09-28

## Contexto

TBD-13: evitar que dos invitados usen el mismo nombre y que alguien vote en nombre de otro. Se decidió que el mail identifique al invitado. Sin verificarlo, cualquiera puede escribir el mail de otro.

## Decisión

- El invitado que entra por link da un nombre visible y un mail, y recibe un enlace mágico. Hasta abrirlo no puede votar ni confirmar.
- El mail es único por grupo entre invitados y **nunca se muestra**. El nombre visible también es único por grupo.
- Los invitados que carga un admin por nombre (RF-111) no tienen mail y no actúan solos.
- Si un usuario se registra con el mismo mail que un invitado verificado, se le puede ofrecer unir el historial sin aprobación del admin (simplificación de RF-112, a confirmar).

## Consecuencias

- RF-110 cambia: ya no alcanza "solo un nombre". Hay más fricción en el caso pensado para bajarla.
- DEP-04 suma mails a invitados.
- Implementado en el esquema (`jugador`, `invitado_token`, trigger de `voto`).
