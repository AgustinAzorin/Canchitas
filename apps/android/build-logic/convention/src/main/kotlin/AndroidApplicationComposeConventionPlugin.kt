import com.android.build.api.dsl.ApplicationExtension
import com.canchitas.buildlogic.configureAndroidCompose
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.getByType

class AndroidApplicationComposeConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("android-application"))
        pluginManager.apply(libs.plugin("compose"))
        configureAndroidCompose(extensions.getByType<ApplicationExtension>())
    }
}
