import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.dependencies

class HiltConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("ksp"))
        dependencies {
            add("ksp", libs.findLibrary("hilt-compiler").get())
        }
        pluginManager.withPlugin("com.android.base") {
            pluginManager.apply(libs.plugin("hilt"))
            dependencies {
                add("implementation", libs.findLibrary("hilt-android").get())
            }
        }
        pluginManager.withPlugin("org.jetbrains.kotlin.jvm") {
            dependencies {
                add("implementation", libs.findLibrary("hilt-core").get())
            }
        }
    }
}
