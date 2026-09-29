plugins {
    alias(libs.plugins.canchitas.android.library)
}

dependencies {
    api(projects.core.data)
    api(projects.core.model)
    api(libs.junit4)
    api(libs.kotlinx.coroutines.test)
}
