package com.canchitas.core.network.salud

import com.canchitas.core.model.EstadoDeLaApi
import com.canchitas.core.network.di.NetworkModule
import com.canchitas.core.network.generated.apis.SaludApi
import kotlin.time.Instant
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Before
import org.junit.Test

class RetrofitSaludNetworkTest {
    private val servidor = MockWebServer()
    private val json = Json { ignoreUnknownKeys = true }
    private lateinit var network: RetrofitSaludNetwork

    @Before
    fun iniciar() {
        servidor.start()
        val retrofit = NetworkModule.crearRetrofit(
            servidor.url("/").toString(),
            json,
            OkHttpClient()
        )
        network = RetrofitSaludNetwork(retrofit.create(SaludApi::class.java), json)
    }

    @After
    fun cerrar() {
        servidor.close()
    }

    @Test
    fun `M0 - 200 es EnLinea con la version y el instante`() = runTest {
        servidor.enqueue(
            MockResponse.Builder()
                .code(200)
                .addHeader("Content-Type", "application/json")
                .body("""{"estado":"ok","version":"1.2.3","instante":"2026-09-28T21:00:00.000Z"}""")
                .build()
        )

        val estado = network.consultarEstado()

        assertEquals(EstadoDeLaApi.EnLinea("1.2.3", Instant.parse("2026-09-28T21:00:00Z")), estado)
    }

    @Test
    fun `M0 - 503 servicio-no-disponible es BaseCaida`() = runTest {
        servidor.enqueue(
            MockResponse.Builder()
                .code(503)
                .addHeader("Content-Type", "application/problem+json")
                .body(
                    """{"type":"https://canchitas.app/errores/servicio-no-disponible",""" +
                        """"title":"El servicio no está disponible","status":503}"""
                )
                .build()
        )

        assertEquals(EstadoDeLaApi.BaseCaida, network.consultarEstado())
    }

    @Test
    fun `M0 - sin respuesta es SinConexion`() = runTest {
        servidor.close()

        assertEquals(EstadoDeLaApi.SinConexion, network.consultarEstado())
    }
}
