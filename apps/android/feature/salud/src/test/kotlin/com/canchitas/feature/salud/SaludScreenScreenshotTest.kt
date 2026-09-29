package com.canchitas.feature.salud

import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class SaludScreenScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    private fun capturar(nombre: String, estado: SaludUiState, oscuro: Boolean = false) {
        composeRule.setContent {
            CanchitasTheme(darkTheme = oscuro) { SaludScreen(uiState = estado) }
        }
        composeRule.onRoot().captureRoboImage("src/test/screenshots/$nombre.png")
    }

    @Test
    fun consultando() = capturar("salud_consultando", SaludUiState.Loading)

    @Test
    fun enLinea() = capturar("salud_en_linea", SaludUiState.Success("1.4.0", "vie 09/10 · 23:00"))

    @Test
    fun enLineaOscuro() = capturar(
        "salud_en_linea_oscuro",
        SaludUiState.Success("1.4.0", "vie 09/10 · 23:00"),
        oscuro = true
    )

    @Test
    fun baseCaida() =
        capturar("salud_base_caida", SaludUiState.Error(SaludUiState.Motivo.BaseCaida))

    @Test
    fun sinConexion() =
        capturar("salud_sin_conexion", SaludUiState.Error(SaludUiState.Motivo.SinConexion))
}
