plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.hilt)
    alias(libs.plugins.canchitas.room)
}

dependencies {
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.robolectric)
}
