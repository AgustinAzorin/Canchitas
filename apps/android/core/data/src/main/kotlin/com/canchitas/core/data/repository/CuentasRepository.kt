package com.canchitas.core.data.repository

import com.canchitas.core.datastore.SesionGuardada
import com.canchitas.core.datastore.SesionLocal
import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.Sesion
import com.canchitas.core.network.cuentas.CuentasNetworkDataSource
import com.canchitas.core.network.sesion.ProveedorDeToken
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Cuentas en Android (RF-001 a RF-007). La sesión se lee de lo guardado en el dispositivo y la
 * red la actualiza (RNF-022). La verificación del mail y la contraseña nueva se completan en la
 * web, que es adonde llevan los enlaces de los mails.
 */
interface CuentasRepository {
    val sesion: Flow<Sesion>

    suspend fun registrar(datos: DatosDeAlta): Resultado<String>

    suspend fun iniciarSesion(email: String, contrasena: String): Resultado<Cuenta>

    /** Trae la cuenta de la API: corre el vencimiento de la sesión (RNF-012) y el estado (RF-004). */
    suspend fun actualizarCuenta(): Resultado<Cuenta>

    suspend fun cerrarSesion(): Resultado<Unit>

    suspend fun reenviarVerificacion(email: String): Resultado<Unit>

    suspend fun pedirRecuperacion(email: String): Resultado<Unit>
}

internal class DefaultCuentasRepository @Inject constructor(
    private val network: CuentasNetworkDataSource,
    private val local: SesionLocal
) : CuentasRepository {
    override val sesion: Flow<Sesion> = local.sesion.map { guardada ->
        if (guardada == null) Sesion.SinSesion else Sesion.Iniciada(guardada.aCuenta())
    }

    override suspend fun registrar(datos: DatosDeAlta): Resultado<String> = network.registrar(datos)

    override suspend fun iniciarSesion(email: String, contrasena: String): Resultado<Cuenta> =
        when (val resultado = network.iniciarSesion(email, contrasena)) {
            is Resultado.Exito -> {
                local.guardar(resultado.valor.cuenta.aGuardada(resultado.valor.token))
                Resultado.Exito(resultado.valor.cuenta)
            }

            is Resultado.Fallo -> resultado
        }

    override suspend fun actualizarCuenta(): Resultado<Cuenta> {
        val guardada = local.cargar() ?: return Resultado.Fallo(SIN_SESION)
        val resultado = network.cuentaActual()
        when {
            resultado is Resultado.Exito -> local.guardar(resultado.valor.aGuardada(guardada.token))
            // La sesión venció (30 días sin uso) o se cerró desde otro lado.
            resultado == Resultado.Fallo(SIN_SESION) -> local.borrar()
        }
        return resultado
    }

    /**
     * RF-007. Sin red no se cierra: la sesión seguiría viva en la API y el dispositivo
     * recibiendo push. Si la API ya no la reconoce, se borra igual.
     */
    override suspend fun cerrarSesion(): Resultado<Unit> {
        local.cargar() ?: return Resultado.Exito(Unit)
        val resultado = network.cerrarSesion()
        return if (resultado is Resultado.Exito || resultado == Resultado.Fallo(SIN_SESION)) {
            local.borrar()
            Resultado.Exito(Unit)
        } else {
            resultado
        }
    }

    override suspend fun reenviarVerificacion(email: String): Resultado<Unit> =
        network.reenviarVerificacion(email)

    override suspend fun pedirRecuperacion(email: String): Resultado<Unit> =
        network.pedirRecuperacion(email)

    private companion object {
        val SIN_SESION = ErrorDeApi.Api("sin-sesion")
    }
}

/** El token que la red agrega a cada pedido (RNF-012). */
internal class TokenDeSesionLocal @Inject constructor(private val local: SesionLocal) : ProveedorDeToken {
    override fun tokenActual(): String? = local.tokenEnMemoria
}

private fun SesionGuardada.aCuenta() = Cuenta(
    id = cuentaId,
    email = email,
    nombreUsuario = nombreUsuario,
    estado = if (verificada) EstadoDeCuenta.Activa else EstadoDeCuenta.SinVerificar
)

private fun Cuenta.aGuardada(token: String) = SesionGuardada(
    token = token,
    cuentaId = id,
    email = email,
    nombreUsuario = nombreUsuario,
    verificada = estado == EstadoDeCuenta.Activa
)
