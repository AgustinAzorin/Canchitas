plugins {
    alias(libs.plugins.canchitas.android.application)
    alias(libs.plugins.canchitas.android.application.compose)
    alias(libs.plugins.canchitas.hilt)
    alias(libs.plugins.roborazzi)
    alias(libs.plugins.kotlin.serialization)
}

android {
    namespace = "com.canchitas.app"
    defaultConfig {
        applicationId = "com.canchitas.app"
        versionCode = 1
        versionName = "0.0.0"
        // Dominio del link de invitación para los App Links (RF-011). El de producción todavía no
        // existe: ./gradlew -Pcanchitas.dominioDeLinks=staging.canchitas.app … La web de ese
        // dominio sirve /.well-known/assetlinks.json con la huella de la firma.
        manifestPlaceholders["dominioDeLinks"] =
            providers.gradleProperty("canchitas.dominioDeLinks").getOrElse("canchitas.app")
    }
    signingConfigs {
        // Keystore de debug del repo, para que la huella de los App Links de dev sea una sola
        // (la sirve la web en dev y CI). Nunca firma un release.
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("debug")
        }
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
    implementation(projects.feature.cuentas)
    implementation(projects.feature.grupos)
    implementation(projects.feature.salud)
    implementation(libs.androidx.hilt.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.navigation.compose)

    // Verificación de M0 contra la API local (SaludContraApiLocalTest).
    testImplementation(projects.core.network)
    testImplementation(projects.core.testing)
    testImplementation(libs.androidx.test.core)
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
