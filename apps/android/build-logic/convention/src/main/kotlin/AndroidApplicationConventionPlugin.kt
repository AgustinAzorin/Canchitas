import com.android.build.api.dsl.ApplicationExtension
import com.canchitas.buildlogic.COMPILE_SDK
import com.canchitas.buildlogic.configureCalidad
import com.canchitas.buildlogic.configureKotlinAndroid
import com.canchitas.buildlogic.libs
import com.canchitas.buildlogic.plugin
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.configure

class AndroidApplicationConventionPlugin : Plugin<Project> {
    override fun apply(target: Project) = with(target) {
        pluginManager.apply(libs.plugin("android-application"))
        extensions.configure<ApplicationExtension> {
            configureKotlinAndroid(this)
            defaultConfig.targetSdk = COMPILE_SDK
        }
        configureCalidad()
    }
}
