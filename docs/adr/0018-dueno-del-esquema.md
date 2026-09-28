# 0018 — El migrador es dueño del esquema y toda migración corre con su rol

- **Estado:** Propuesta
- **Fecha:** 2026-09-28

## Contexto

El ADR 0005 pide roles con mínimo privilegio y que la API y el worker no puedan alterar el esquema. Las migraciones iniciales las corrió un superusuario, así que sus objetos eran de `postgres`, y los permisos por defecto (`ALTER DEFAULT PRIVILEGES`) solo se aplican a lo que crea el rol que los define. Si una migración nueva la corre otro rol, sus tablas no quedan disponibles para la API.

## Decisión

- La migración `20260928215000_roles.sql` crea los cuatro roles y pasa a `canchitas_migrator` la propiedad de todo lo que no pertenece a una extensión. Esa migración y su `down` los corre un superusuario.
- **Toda migración posterior empieza cada sección con `SET LOCAL ROLE canchitas_migrator;`**, después de los `SET LOCAL` de timeouts. Así todo objeto nuevo es del migrador y hereda los permisos de la API, el worker y readonly, se conecte dbmate como superusuario (dev, CI, primer deploy) o como el migrador (prod).
- `pnpm db:new` crea el archivo con ese encabezado y `pnpm db:lint` falla si falta.
- Los roles se crean sin contraseña; la pone la infraestructura (SOPS en staging y prod, el nombre del rol en dev).

## Consecuencias

- Crear extensiones sigue necesitando un superusuario: una migración que lo haga no puede usar el rol del migrador para ese paso.
- El `down` de la migración de roles solo borra un rol si no se usa en otra base del mismo servidor.
