# 0012 — Mapas con OpenStreetMap en PMTiles propias

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

RES-03 y RES-04 obligan a OpenStreetMap sin APIs pagas. La política de uso de `tile.openstreetmap.org` permite bloquear aplicaciones con uso intensivo sin aviso.

## Decisión

- **Teselas vectoriales propias:** un extracto de AMBA en formato **PMTiles** (Protomaps), en un bucket público de Cloudflare R2.
- **MapLibre** en web y Android, con un estilo base de Protomaps ajustado a los tokens.
- **Geocodificación con Nominatim**, solo al cargar o aprobar una cancha, respetando su límite de 1 pedido por segundo y con User-Agent identificable.
- **Distancias y filtros en PostGIS** (`ST_DWithin`), nunca en el cliente.
- Atribución de OpenStreetMap visible en el mapa.

## Consecuencias

- El extracto se regenera periódicamente con un job de CI.
- No se usa `tile.openstreetmap.org` en ningún ambiente.
