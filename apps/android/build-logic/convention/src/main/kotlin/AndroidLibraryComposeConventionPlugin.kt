import com.android.build.api.dsl.LibraryExtension
import com.canchitas.buildlogic.configureAndroidCompose
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.getByType

class AndroidLibraryComposeConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("android-library"))
        pluginManager.apply(libs.plugin("compose"))
        configureAndroidCompose(extensions.getByType<LibraryExtension>())
    }
}
