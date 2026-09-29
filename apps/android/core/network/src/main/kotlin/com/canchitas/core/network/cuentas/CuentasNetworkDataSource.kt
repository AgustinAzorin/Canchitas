package com.canchitas.core.network.cuentas

import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.network.generated.apis.CuentasApi
import com.canchitas.core.network.generated.models.EstadoDeCuenta as EstadoDeRed
import com.canchitas.core.network.generated.models.SolicitudConEmailInput
import com.canchitas.core.network.generated.models.SolicitudDeAltaInput
import com.canchitas.core.network.generated.models.SolicitudDeInicioInput
import java.io.IOException
import javax.inject.Inject
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json
import retrofit2.Response

/** Sesión recién iniciada en Android: el bearer y la cuenta (RF-005, RNF-012). */
data class SesionDeRed(val token: String, val cuenta: Cuenta)

/** Rutas /v1/cuentas (RF-001 a RF-007). La verificación y el cambio de contraseña se hacen en la web. */
interface CuentasNetworkDataSource {
    /** Devuelve el mail al que se mandó la verificación. */
    suspend fun registrar(datos: DatosDeAlta): Resultado<String>

    suspend fun iniciarSesion(email: String, contrasena: String): Resultado<SesionDeRed>

    suspend fun cuentaActual(): Resultado<Cuenta>

    suspend fun cerrarSesion(): Resultado<Unit>

    suspend fun reenviarVerificacion(email: String): Resultado<Unit>

    suspend fun pedirRecuperacion(email: String): Resultado<Unit>
}

/** Traduce cada respuesta a un Resultado; los errores se leen por el `type` del problem+json. */
class RetrofitCuentasNetwork @Inject constructor(
    private val api: CuentasApi,
    private val json: Json
) : CuentasNetworkDataSource {
    override suspend fun registrar(datos: DatosDeAlta): Resultado<String> = llamar(
        {
            api.registrarCuenta(
                SolicitudDeAltaInput(
                    email = datos.email,
                    contrasena = datos.contrasena,
                    nombreUsuario = datos.nombreUsuario,
                    fechaNacimiento = datos.fechaNacimiento,
                    aceptaPrivacidad = datos.aceptaPrivacidad
                )
            )
        }
    ) { it.email }

    override suspend fun iniciarSesion(email: String, contrasena: String): Resultado<SesionDeRed> =
        llamar(
            {
                api.iniciarSesionConToken(
                    SolicitudDeInicioInput(email = email, contrasena = contrasena)
                )
            }
        ) { SesionDeRed(token = it.token, cuenta = it.cuenta.aModelo()) }

    override suspend fun cuentaActual(): Resultado<Cuenta> =
        llamar({ api.consultarCuentaActual() }) { it.aModelo() }

    override suspend fun cerrarSesion(): Resultado<Unit> = llamarSinCuerpo { api.cerrarSesion() }

    override suspend fun reenviarVerificacion(email: String): Resultado<Unit> =
        llamarSinCuerpo { api.reenviarVerificacion(SolicitudConEmailInput(email)) }

    override suspend fun pedirRecuperacion(email: String): Resultado<Unit> =
        llamarSinCuerpo { api.pedirRecuperacion(SolicitudConEmailInput(email)) }

    private suspend fun llamarSinCuerpo(pedido: suspend () -> Response<Unit>): Resultado<Unit> =
        conRed {
            val respuesta = pedido()
            if (respuesta.isSuccessful) Resultado.Exito(Unit) else Resultado.Fallo(error(respuesta))
        }

    private suspend fun <T, R> llamar(
        pedido: suspend () -> Response<T>,
        aValor: (T) -> R
    ): Resultado<R> = conRed {
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

private fun com.canchitas.core.network.generated.models.Cuenta.aModelo() = Cuenta(
    id = id.toString(),
    email = email,
    nombreUsuario = nombreUsuario,
    estado = when (estado) {
        EstadoDeRed.SIN_VERIFICAR -> EstadoDeCuenta.SinVerificar
        EstadoDeRed.ACTIVA -> EstadoDeCuenta.Activa
    }
)
