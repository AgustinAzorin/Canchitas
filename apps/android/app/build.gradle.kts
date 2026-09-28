plugins {
    alias(libs.plugins.canchitas.android.application)
    alias(libs.plugins.canchitas.android.application.compose)
    alias(libs.plugins.canchitas.hilt)
    alias(libs.plugins.roborazzi)
}

android {
    namespace = "com.canchitas.app"
    defaultConfig {
        applicationId = "com.canchitas.app"
        versionCode = 1
        versionName = "0.0.0"
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}

dependencies {
    implementation(projects.core.designsystem)
    implementation(projects.core.data)
    implementation(projects.feature.salud)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.navigation.compose)

    // Verificación de M0 contra la API local (SaludContraApiLocalTest).
    testImplementation(projects.core.network)
    testImplementation(projects.core.common)
    testImplementation(libs.androidx.lifecycle.runtime.compose)
    testImplementation(libs.junit4)
    testImplementation(libs.kotlinx.serialization.json)
    testImplementation(libs.okhttp)
    testImplementation(libs.retrofit.core)
    testImplementation(libs.robolectric)
    testImplementation(libs.roborazzi)
    testImplementation(libs.roborazzi.compose)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
