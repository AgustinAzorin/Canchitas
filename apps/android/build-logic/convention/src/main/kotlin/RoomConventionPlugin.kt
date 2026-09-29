import androidx.room3.gradle.RoomExtension
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.dependencies

/** Room como fuente de verdad para leer (ADR 0011, RNF-022), con el esquema commiteado. */
class RoomConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("ksp"))
        pluginManager.apply(libs.plugin("room"))
        extensions.configure<RoomExtension> {
            // Un JSON por versión del esquema, para escribir y probar las migraciones.
            schemaDirectory("$projectDir/schemas")
        }
        dependencies {
            add("api", libs.findLibrary("room-runtime").get())
            add("ksp", libs.findLibrary("room-compiler").get())
        }
    }
}
