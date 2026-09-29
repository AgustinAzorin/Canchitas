package com.canchitas.core.network.cuentas

import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.network.LlamadorDeApi
import com.canchitas.core.network.generated.apis.CuentasApi
import com.canchitas.core.network.generated.models.EstadoDeCuenta as EstadoDeRed
import com.canchitas.core.network.generated.models.SolicitudConEmailInput
import com.canchitas.core.network.generated.models.SolicitudDeAltaInput
import com.canchitas.core.network.generated.models.SolicitudDeInicioInput
import javax.inject.Inject

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

/** Rutas /v1/cuentas con el cliente generado. */
class RetrofitCuentasNetwork @Inject constructor(
    private val api: CuentasApi,
    private val llamador: LlamadorDeApi
) : CuentasNetworkDataSource {
    override suspend fun registrar(datos: DatosDeAlta): Resultado<String> = llamador.llamar(
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
        llamador.llamar(
            {
                api.iniciarSesionConToken(
                    SolicitudDeInicioInput(email = email, contrasena = contrasena)
                )
            }
        ) { SesionDeRed(token = it.token, cuenta = it.cuenta.aModelo()) }

    override suspend fun cuentaActual(): Resultado<Cuenta> =
        llamador.llamar({ api.consultarCuentaActual() }) { it.aModelo() }

    override suspend fun cerrarSesion(): Resultado<Unit> = llamador.llamarSinCuerpo {
        api.cerrarSesion()
    }

    override suspend fun reenviarVerificacion(email: String): Resultado<Unit> =
        llamador.llamarSinCuerpo { api.reenviarVerificacion(SolicitudConEmailInput(email)) }

    override suspend fun pedirRecuperacion(email: String): Resultado<Unit> =
        llamador.llamarSinCuerpo { api.pedirRecuperacion(SolicitudConEmailInput(email)) }
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
