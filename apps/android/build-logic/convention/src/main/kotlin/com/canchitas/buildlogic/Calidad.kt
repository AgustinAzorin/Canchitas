package com.canchitas.buildlogic

import io.gitlab.arturbosch.detekt.Detekt
import io.gitlab.arturbosch.detekt.extensions.DetektExtension
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.withType
import org.jlleitschuh.gradle.ktlint.KtlintExtension

/** detekt y ktlint en todos los módulos (ADR 0011). El código generado no se revisa. */
internal fun Project.configureCalidad() {
    pluginManager.apply(libs.plugin("detekt"))
    pluginManager.apply(libs.plugin("ktlint"))

    extensions.configure<DetektExtension> {
        buildUponDefaultConfig = true
        config.setFrom(rootProject.file("config/detekt/detekt.yml"))
    }
    tasks.withType<Detekt>().configureEach {
        exclude { it.file.path.contains("/generated/") || it.file.path.contains("/build/") }
    }

    extensions.configure<KtlintExtension> {
        version.set(libs.findVersion("ktlint").get().requiredVersion)
        filter {
            exclude { it.file.path.contains("/generated/") || it.file.path.contains("/build/") }
        }
    }
}
