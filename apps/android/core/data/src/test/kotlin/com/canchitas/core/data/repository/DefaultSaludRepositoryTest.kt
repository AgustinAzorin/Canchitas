package com.canchitas.core.data.repository

import app.cash.turbine.test
import com.canchitas.core.model.EstadoDeLaApi
import com.canchitas.core.network.salud.SaludNetworkDataSource
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test

class DefaultSaludRepositoryTest {
    private val respuestas = ArrayDeque(listOf(EstadoDeLaApi.SinConexion, EstadoDeLaApi.BaseCaida))
    private var consultas = 0
    private val network = object : SaludNetworkDataSource {
        override suspend fun consultarEstado(): EstadoDeLaApi {
            consultas++
            return respuestas.removeFirst()
        }
    }

    @Test
    fun `M0 - consulta al observar y vuelve a consultar cada 10 segundos (RNF-002)`() = runTest {
        val repositorio = DefaultSaludRepository(network, StandardTestDispatcher(testScheduler))

        repositorio.observarEstado().test {
            assertEquals(EstadoDeLaApi.SinConexion, awaitItem())
            assertEquals(1, consultas)

            testScheduler.advanceTimeBy(DefaultSaludRepository.INTERVALO)
            assertEquals(EstadoDeLaApi.BaseCaida, awaitItem())
            assertEquals(2, consultas)

            cancelAndIgnoreRemainingEvents()
        }
    }
}
