plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.android.library.compose)
}

// Tema generado desde docs/design-system/tokens.json con `pnpm tokens` (ADR 0017). No se edita.
androidComponents {
    onVariants { variant ->
        variant.sources.kotlin?.addStaticSourceDirectory("src/generated/kotlin")
    }
}

dependencies {
    api(libs.androidx.compose.material3)
    api(libs.androidx.compose.ui)
}
