import com.canchitas.buildlogic.configureCalidad
import com.canchitas.buildlogic.configureKotlinJvm
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.dependencies

class JvmLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("kotlin-jvm"))
        configureKotlinJvm()
        configureCalidad()
        dependencies {
            add("testImplementation", libs.findLibrary("junit4").get())
        }
    }
}
