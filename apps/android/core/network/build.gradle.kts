import org.openapitools.generator.gradle.plugin.tasks.GenerateTask

plugins {
    alias(libs.plugins.canchitas.android.library)
    alias(libs.plugins.canchitas.hilt)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.openapi.generator)
}

android {
    buildFeatures.buildConfig = true
    // La API local detrás de Caddy (infra/compose). 10.0.2.2 es el host visto desde el emulador.
    // Con un teléfono conectado: ./gradlew -Pcanchitas.apiUrl=http://<ip-de-la-pc>:8080/ …
    val apiUrlDeDev = providers.gradleProperty(
        "canchitas.apiUrl"
    ).getOrElse("http://10.0.2.2:8080/")
    buildTypes {
        getByName("debug") { buildConfigField("String", "API_URL", "\"$apiUrlDeDev\"") }
        getByName("release") { buildConfigField("String", "API_URL", "\"https://canchitas.app/\"") }
    }
}

androidComponents {
    onVariants { variant ->
        variant.sources.kotlin?.addStaticSourceDirectory("build/generated/openapi/src/main/kotlin")
    }
}

// Cliente generado desde contract/openapi.json (ADR 0007, ADR 0011). No se edita.
val generarCliente = tasks.named<GenerateTask>("openApiGenerate") {
    generatorName = "kotlin"
    library = "jvm-retrofit2"
    inputSpec = rootProject.layout.projectDirectory.file("../../contract/openapi.json")
    outputDir = layout.buildDirectory.dir("generated/openapi")
    packageName = "com.canchitas.core.network.generated"
    globalProperties =
        mapOf(
            "apis" to "",
            "models" to "",
            "supportingFiles" to "CollectionFormats.kt",
            "modelDocs" to "false",
            "apiDocs" to "false"
        )
    configOptions = mapOf(
        "serializationLibrary" to "kotlinx_serialization",
        "useCoroutines" to "true",
        "dateLibrary" to "string",
        "enumPropertyNaming" to "UPPERCASE"
    )
    generateModelTests = false
    generateApiTests = false
}

tasks.named("preBuild") { dependsOn(generarCliente) }
tasks.matching { it.name.startsWith("ksp") }.configureEach { dependsOn(generarCliente) }

dependencies {
    api(projects.core.model)
    implementation(projects.core.common)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.retrofit.core)
    implementation(libs.retrofit.kotlinx.serialization)
    testImplementation(libs.okhttp.mockwebserver)
}
