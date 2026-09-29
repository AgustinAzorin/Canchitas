plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.android.library.compose)
}

// Componentes compuestos que comparten los features (ADR 0011), sobre core:designsystem.
dependencies {
    api(projects.core.designsystem)
}
