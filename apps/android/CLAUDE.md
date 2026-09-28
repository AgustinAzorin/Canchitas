# CLAUDE.md — apps/android

App Android de Canchitas. Kotlin + Jetpack Compose + Material 3, `minSdk` 28. Arquitectura de Now in Android. Decisiones: ADR 0002, 0007, 0011, 0012, 0017.

## Módulos

```
app/                     Application, navegación de nivel superior, MainActivity
build-logic/             convention plugins (android-library, android-feature, compose, hilt, room, …)
core/model               modelos de dominio del cliente (Kotlin puro)
core/network             cliente generado desde contract/openapi.json + adaptadores
core/database            Room: entidades, DAOs, migraciones
core/data                repositorios: combinan network y database, exponen Flow
core/designsystem        tema y componentes generados desde tokens.json (no se editan los generados)
core/ui                  componentes compuestos reutilizables (MatchCard, PlayerRow, …)
core/common              utilidades: dispatchers, resultado, formato de fecha y moneda
core/testing             fakes y reglas de test compartidas
feature/<nombre>         una pantalla o flujo: ViewModel + UI + navegación del feature
```

Un `feature` depende de `core:*`, nunca de otro `feature`.

## Reglas

- **Flujo unidireccional.** El `ViewModel` expone un único `StateFlow<XUiState>` (sealed interface: `Loading`, `Success`, `Error`) y recibe eventos. La UI es una función de ese estado.
- **Repositorios** exponen `Flow` leyendo de Room. La red actualiza Room; la UI nunca lee de la red directo (RNF-022).
- **Escrituras:** requieren red. Sin conexión se rechazan con un mensaje claro, sin encolar.
- **Sin reglas de negocio.** La API decide; la app muestra. Los errores de la API se mapean por el `type` del `problem+json`.
- **Diseño:** solo `MaterialTheme` y los componentes de `core:designsystem`. `Button` con `shape = MaterialTheme.shapes.medium` (M3 los hace pill por defecto). Sin colores sueltos. Objetivos táctiles de 48 dp. Ver `docs/design-system/GUIDELINES.md`.
- **Textos** en `strings.xml` de cada módulo. Voseo, sin exclamaciones ni emojis. Plurales con `plurals`.
- **Fechas** con kotlinx-datetime, mostradas en `America/Argentina/Buenos_Aires`. **Plata** en pesos enteros, formateada en `core:common`.
- **Permisos** (ubicación, notificaciones) se piden solo al usar la función que los necesita, y la app sigue funcionando si se niegan (RI-004).
- **Inyección** con Hilt. Sin `lateinit` para dependencias.

## Tests

- ViewModels y repositorios con JUnit + Turbine y fakes de `core:testing`.
- UI con Compose UI tests y screenshot tests con Roborazzi.
- ID del requisito en el nombre del test.

## Nunca

- `!!`, `GlobalScope`, `runBlocking` fuera de tests.
- Llamadas de red desde un Composable o un ViewModel sin pasar por un repositorio.
- Editar el cliente generado o los archivos generados del design system.
