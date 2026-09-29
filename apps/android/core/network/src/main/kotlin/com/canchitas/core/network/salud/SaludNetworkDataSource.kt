package com.canchitas.core.network.salud

import com.canchitas.core.model.EstadoDeLaApi
import com.canchitas.core.network.generated.apis.SaludApi
import java.io.IOException
import javax.inject.Inject
import kotlin.time.Instant
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

interface SaludNetworkDataSource {
    suspend fun consultarEstado(): EstadoDeLaApi
}

/** Traduce GET /v1/salud a un estado; los errores se leen por el `type` del problem+json. */
class RetrofitSaludNetwork @Inject constructor(private val api: SaludApi, private val json: Json) :
    SaludNetworkDataSource {
    override suspend fun consultarEstado(): EstadoDeLaApi = try {
        val respuesta = api.consultarSalud()
        val salud = respuesta.body()
        when {
            respuesta.isSuccessful && salud != null ->
                EstadoDeLaApi.EnLinea(
                    version = salud.version,
                    instante = Instant.parse(salud.instante)
                )

            tipoDeProblema(
                respuesta.errorBody()?.string()
            ) == TIPO_BASE_CAIDA -> EstadoDeLaApi.BaseCaida

            else -> EstadoDeLaApi.SinConexion
        }
    } catch (_: IOException) {
        EstadoDeLaApi.SinConexion
    } catch (_: SerializationException) {
        EstadoDeLaApi.SinConexion
    } catch (_: IllegalArgumentException) {
        EstadoDeLaApi.SinConexion
    }

    private fun tipoDeProblema(cuerpo: String?): String? = cuerpo?.let {
        runCatching { json.decodeFromString<TipoDeProblema>(it).type }.getOrNull()
    }

    @Serializable
    private data class TipoDeProblema(val type: String)

    private companion object {
        const val TIPO_BASE_CAIDA = "https://canchitas.app/errores/servicio-no-disponible"
    }
}
