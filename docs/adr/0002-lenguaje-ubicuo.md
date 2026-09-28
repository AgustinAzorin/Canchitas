# 0002 — Lenguaje ubicuo en español

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Contexto

El SRS, la base de datos y la interfaz están en español rioplatense (RI-003). Los frameworks y los patrones técnicos tienen nombres establecidos en inglés.

## Decisión

- **Conceptos del dominio en español**, con los mismos nombres que el SRS y la base: `Partido`, `Participacion`, `Votacion`, `confirmarAsistencia`, `listaDeEspera`. Sin tildes ni ñ en identificadores (`resena`, `anio`).
- **Patrones y piezas técnicas en inglés**, porque así se conocen: `PartidoRepository`, `routes`, `ViewModel`, `UiState`, `Result`.
- **Comentarios, documentación, mensajes de commit y textos de la interfaz en español.** Los tipos de commit siguen Conventional Commits en inglés (`feat`, `fix`, `refactor`…).
- **Textos visibles siempre en archivos de recursos**, aunque haya un solo idioma: `strings.xml` en Android y un catálogo de mensajes en la web. Nunca literales en los componentes.

## Consecuencias

Un mismo concepto tiene el mismo nombre en el SRS, la tabla, el tipo de TypeScript, la clase de Kotlin y la pantalla. Buscar `participacion` encuentra todo lo relacionado.
