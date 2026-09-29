package com.canchitas.app

import android.graphics.Bitmap
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.data.repository.SaludRepository
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.core.model.EstadoDeLaApi
import com.canchitas.core.network.di.NetworkModule
import com.canchitas.core.network.generated.apis.SaludApi
import com.canchitas.core.network.salud.RetrofitSaludNetwork
import com.canchitas.feature.salud.SaludScreen
import com.canchitas.feature.salud.SaludViewModel
import java.io.File
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import okhttp3.OkHttpClient
import org.junit.Assume.assumeTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Criterio de hecho de M0: la app muestra /v1/salud de la API local. Usa el mismo cliente
 * generado, la misma fuente de red, el ViewModel y la pantalla reales; solo reemplaza el
 * emulador por Robolectric. Corre si CANCHITAS_API_URL apunta a la API (p. ej. http://localhost:8080/).
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h640dp-xhdpi")
class SaludContraApiLocalTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun `M0 - la app muestra el estado de la API local`() {
        val url = System.getenv("CANCHITAS_API_URL")
        assumeTrue("Definí CANCHITAS_API_URL para correr contra la API local", url != null)
        val json = NetworkModule.providesJson()
        val retrofit = NetworkModule.crearRetrofit(requireNotNull(url), json, OkHttpClient())
        val network = RetrofitSaludNetwork(retrofit.create(SaludApi::class.java), json)
        val repositorio = object : SaludRepository {
            override fun observarEstado(): Flow<EstadoDeLaApi> = flow {
                emit(network.consultarEstado())
            }
        }
        val viewModel = SaludViewModel(repositorio)

        composeRule.setContent {
            val uiState by viewModel.uiState.collectAsStateWithLifecycle()
            CanchitasTheme { SaludScreen(uiState = uiState) }
        }

        composeRule.waitUntil(timeoutMillis = 10_000) {
            composeRule.onAllNodes(
                hasText("La API está en línea.")
            ).fetchSemanticsNodes().isNotEmpty()
        }
        // Evidencia, no regresión: muestra la hora del servidor, así que se guarda sin comparar
        // (no pasa por Roborazzi, que en CI verifica contra una referencia).
        val archivo = File("build/outputs/salud_contra_api_local.png").apply {
            parentFile?.mkdirs()
        }
        archivo.outputStream().use { salida ->
            composeRule.onRoot().captureToImage().asAndroidBitmap().compress(
                Bitmap.CompressFormat.PNG,
                100,
                salida
            )
        }
    }
}
