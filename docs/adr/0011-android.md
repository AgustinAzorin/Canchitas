# 0011 — Android nativo con la arquitectura de Now in Android

- **Estado:** Aceptada
- **Fecha:** 2026-09-28

## Decisión

- **Kotlin + Jetpack Compose + Material 3.** `minSdk` 28 (RNF-021).
- **Arquitectura de referencia: Now in Android** (Google):
  - módulos `core:data`, `core:database`, `core:network`, `core:designsystem`, `core:model`, `core:common`, `core:testing` y `feature:<nombre>`;
  - convention plugins en `build-logic/`; version catalog en `gradle/libs.versions.toml`.
- **Flujo de datos unidireccional:** `ViewModel` expone `StateFlow<UiState>`; la UI manda eventos; los repositorios exponen `Flow`.
- **Offline (RNF-022):** Room es la fuente de verdad para lectura. Las escrituras exigen red y se rechazan sin conexión con un mensaje claro.
- **Red:** cliente generado desde `contract/openapi.json` con openapi-generator (Retrofit + OkHttp + kotlinx.serialization).
- **Hilt** para inyección de dependencias. **kotlinx-datetime** para fechas.
- **Push:** Firebase Cloud Messaging.
- **Mapa:** MapLibre Native con las mismas PMTiles que la web.
- **Links de invitación:** Android App Links.
- **Calidad:** detekt con reglas de Compose, ktlint, Android Lint con advertencias como errores, Roborazzi para screenshot tests, Kover, Baseline Profiles y R8.
- `core:designsystem` se genera desde `tokens.json` (ADR 0017).

## Consecuencias

- Es la estructura Android más documentada: cualquier duda de organización se resuelve mirando cómo lo hace Now in Android.
