import com.canchitas.buildlogic.configureRoborazzi
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.dependencies

/** Un feature es una pantalla o flujo: depende de core:*, nunca de otro feature (ADR 0011). */
class AndroidFeatureConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("canchitas-android-library"))
        pluginManager.apply(libs.plugin("canchitas-android-library-compose"))
        pluginManager.apply(libs.plugin("canchitas-hilt"))
        configureRoborazzi()

        dependencies {
            add("implementation", project(":core:designsystem"))
            add("implementation", project(":core:data"))
            add("implementation", project(":core:model"))
            add("implementation", project(":core:common"))
            add("implementation", libs.findLibrary("androidx-hilt-lifecycle-viewmodel-compose").get())
            add("implementation", libs.findLibrary("androidx-lifecycle-runtime-compose").get())
            add("implementation", libs.findLibrary("androidx-lifecycle-viewmodel-compose").get())
            add("implementation", libs.findLibrary("androidx-navigation-compose").get())
            add("testImplementation", project(":core:testing"))
            add("testImplementation", libs.findLibrary("turbine").get())
        }
    }
}
