package com.canchitas.core.network

import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import java.io.IOException
import javax.inject.Inject
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response

/** Traduce cada respuesta a un Resultado; los errores se leen por el `type` del problem+json. */
class LlamadorDeApi @Inject constructor(private val json: Json) {
    suspend fun llamarSinCuerpo(pedido: suspend () -> Response<Unit>): Resultado<Unit> = conRed {
        val respuesta = pedido()
        if (respuesta.isSuccessful) Resultado.Exito(Unit) else Resultado.Fallo(error(respuesta))
    }

    suspend fun <T, R> llamar(pedido: suspend () -> Response<T>, aValor: (T) -> R): Resultado<R> =
        conRed {
            val respuesta = pedido()
            val cuerpo = respuesta.body()
            when {
                respuesta.isSuccessful && cuerpo != null -> Resultado.Exito(aValor(cuerpo))
                respuesta.isSuccessful -> Resultado.Fallo(ErrorDeApi.Inesperado)
                else -> Resultado.Fallo(error(respuesta))
            }
        }

    private suspend fun <R> conRed(bloque: suspend () -> Resultado<R>): Resultado<R> = try {
        bloque()
    } catch (_: IOException) {
        Resultado.Fallo(ErrorDeApi.SinConexion)
    } catch (_: SerializationException) {
        Resultado.Fallo(ErrorDeApi.Inesperado)
    } catch (_: IllegalArgumentException) {
        Resultado.Fallo(ErrorDeApi.Inesperado)
    }

    private fun error(respuesta: Response<*>): ErrorDeApi {
        val tipo = respuesta.errorBody()?.string()?.let { cuerpo ->
            runCatching { json.decodeFromString<TipoDeProblema>(cuerpo).type }.getOrNull()
        }
        return if (tipo != null && tipo.startsWith(BASE_DE_TIPOS)) {
            ErrorDeApi.Api(tipo.removePrefix(BASE_DE_TIPOS))
        } else {
            ErrorDeApi.Inesperado
        }
    }

    @Serializable
    private data class TipoDeProblema(val type: String)

    private companion object {
        const val BASE_DE_TIPOS = "https://canchitas.app/errores/"
    }
}
