plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.hilt)
}

dependencies {
    api(libs.kotlinx.coroutines.core)
    api(libs.kotlinx.datetime)
}
