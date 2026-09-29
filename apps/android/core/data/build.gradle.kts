plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.hilt)
}

dependencies {
    api(projects.core.model)
    implementation(projects.core.common)
    implementation(projects.core.datastore)
    implementation(projects.core.network)
    testImplementation(libs.turbine)
    testImplementation(libs.androidx.datastore)
}
