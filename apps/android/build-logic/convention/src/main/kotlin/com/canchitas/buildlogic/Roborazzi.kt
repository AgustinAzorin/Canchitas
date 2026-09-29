package com.canchitas.buildlogic

import org.gradle.api.Project
import org.gradle.kotlin.dsl.dependencies

/** Screenshot tests con Roborazzi sobre Robolectric (ADR 0011, ADR 0014). */
internal fun Project.configureRoborazzi() {
    pluginManager.apply(libs.plugin("roborazzi"))
    dependencies {
        add("testImplementation", libs.findLibrary("robolectric").get())
        add("testImplementation", libs.findLibrary("roborazzi").get())
        add("testImplementation", libs.findLibrary("roborazzi-compose").get())
        add("testImplementation", libs.findLibrary("androidx-compose-ui-test-junit4").get())
        add("debugImplementation", libs.findLibrary("androidx-compose-ui-test-manifest").get())
    }
}
