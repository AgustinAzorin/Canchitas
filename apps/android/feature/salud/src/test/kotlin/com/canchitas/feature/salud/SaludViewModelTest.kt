package com.canchitas.feature.salud

import app.cash.turbine.test
import com.canchitas.core.model.EstadoDeLaApi
import com.canchitas.core.testing.repository.TestSaludRepository
import com.canchitas.core.testing.util.MainDispatcherRule
import kotlin.time.Instant
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class SaludViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repositorio = TestSaludRepository()
    private val viewModel = SaludViewModel(repositorio)

    @Test
    fun `M0 - empieza cargando`() = runTest {
        assertEquals(SaludUiState.Loading, viewModel.uiState.value)
    }

    @Test
    fun `M0 - en linea muestra la version y la hora de Argentina`() = runTest {
        viewModel.uiState.test {
            assertEquals(SaludUiState.Loading, awaitItem())

            repositorio.enviar(
                EstadoDeLaApi.EnLinea("1.2.3", Instant.parse("2026-10-10T02:00:00Z"))
            )

            assertEquals(
                SaludUiState.Success(version = "1.2.3", horaDelServidor = "vie 09/10 · 23:00"),
                awaitItem()
            )
        }
    }

    @Test
    fun `M0 - base caida y sin conexion son errores distintos`() = runTest {
        viewModel.uiState.test {
            skipItems(1)

            repositorio.enviar(EstadoDeLaApi.BaseCaida)
            assertEquals(SaludUiState.Error(SaludUiState.Motivo.BaseCaida), awaitItem())

            repositorio.enviar(EstadoDeLaApi.SinConexion)
            assertEquals(SaludUiState.Error(SaludUiState.Motivo.SinConexion), awaitItem())
        }
    }
}
