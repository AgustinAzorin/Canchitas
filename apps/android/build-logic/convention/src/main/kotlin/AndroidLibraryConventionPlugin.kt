import com.android.build.api.dsl.LibraryExtension
import com.canchitas.buildlogic.configureCalidad
import com.canchitas.buildlogic.configureKotlinAndroid
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies

class AndroidLibraryConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("android-library"))
        extensions.configure<LibraryExtension> {
            configureKotlinAndroid(this)
            // Namespace a partir de la ruta: :core:network → com.canchitas.core.network.
            namespace = "com.canchitas" + path.replace(':', '.')
        }
        configureCalidad()
        dependencies {
            add("testImplementation", libs.findLibrary("junit4").get())
            add("testImplementation", libs.findLibrary("kotlinx-coroutines-test").get())
        }
    }
}
