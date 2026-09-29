package com.canchitas.core.testing.repository

import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.Sesion
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** Repositorio de cuentas controlado desde el test: cada operación responde lo que se le diga. */
class TestCuentasRepository : CuentasRepository {
    private val sesionActual = MutableStateFlow<Sesion>(Sesion.SinSesion)
    override val sesion: Flow<Sesion> = sesionActual

    val altas = mutableListOf<DatosDeAlta>()
    val inicios = mutableListOf<Pair<String, String>>()
    val reenvios = mutableListOf<String>()
    val recuperaciones = mutableListOf<String>()

    var respuestaDeAlta: Resultado<String> = Resultado.Exito("ana@mail.com")
    var respuestaDeInicio: Resultado<Cuenta>? = null
    var respuestaDeActualizacion: Resultado<Cuenta>? = null
    var respuestaDeCierre: Resultado<Unit> = Resultado.Exito(Unit)
    var respuestaSinCuerpo: Resultado<Unit> = Resultado.Exito(Unit)

    /** Si se completa desde el test, las operaciones esperan hasta entonces (estado "enviando"). */
    var espera: CompletableDeferred<Unit>? = null

    fun cambiarSesion(sesion: Sesion) {
        sesionActual.value = sesion
    }

    private suspend fun esperar() {
        espera?.await()
    }

    override suspend fun registrar(datos: DatosDeAlta): Resultado<String> {
        altas += datos
        esperar()
        return respuestaDeAlta
    }

    override suspend fun iniciarSesion(email: String, contrasena: String): Resultado<Cuenta> {
        inicios += email to contrasena
        esperar()
        val respuesta = requireNotNull(respuestaDeInicio) { "Definí respuestaDeInicio" }
        if (respuesta is Resultado.Exito) sesionActual.value = Sesion.Iniciada(respuesta.valor)
        return respuesta
    }

    override suspend fun actualizarCuenta(): Resultado<Cuenta> {
        val respuesta = respuestaDeActualizacion ?: return Resultado.Fallo(ErrorDeApi.Inesperado)
        if (respuesta is Resultado.Exito) sesionActual.value = Sesion.Iniciada(respuesta.valor)
        return respuesta
    }

    override suspend fun cerrarSesion(): Resultado<Unit> {
        esperar()
        if (respuestaDeCierre is Resultado.Exito) sesionActual.value = Sesion.SinSesion
        return respuestaDeCierre
    }

    override suspend fun reenviarVerificacion(email: String): Resultado<Unit> {
        reenvios += email
        esperar()
        return respuestaSinCuerpo
    }

    override suspend fun pedirRecuperacion(email: String): Resultado<Unit> {
        recuperaciones += email
        esperar()
        return respuestaSinCuerpo
    }
}
