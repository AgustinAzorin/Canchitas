plugins {
    alias(libs.plugins.canchitas.android.feature)
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(libs.kotlinx.serialization.json)
}
