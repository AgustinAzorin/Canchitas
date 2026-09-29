plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.hilt)
    alias(libs.plugins.kotlin.serialization)
}

dependencies {
    implementation(projects.core.common)
    implementation(libs.androidx.datastore)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.tink.android)
    testImplementation(libs.kotlinx.coroutines.test)
}
