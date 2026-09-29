package com.canchitas.core.data.repository

import androidx.datastore.core.DataStoreFactory
import app.cash.turbine.test
import com.canchitas.core.datastore.Cifrador
import com.canchitas.core.datastore.SerializadorDeSesion
import com.canchitas.core.datastore.SesionLocal
import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.Sesion
import com.canchitas.core.network.cuentas.CuentasNetworkDataSource
import com.canchitas.core.network.cuentas.SesionDeRed
import java.nio.file.Files
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class DefaultCuentasRepositoryTest {
    private val cuenta = Cuenta("id-ana", "ana@mail.com", "ana_10", EstadoDeCuenta.SinVerificar)

    private class RedFalsa : CuentasNetworkDataSource {
        var inicio: Resultado<SesionDeRed> = Resultado.Fallo(ErrorDeApi.Inesperado)
        var actual: Resultado<Cuenta> = Resultado.Fallo(ErrorDeApi.Inesperado)
        var cierre: Resultado<Unit> = Resultado.Exito(Unit)

        override suspend fun registrar(datos: DatosDeAlta) = Resultado.Exito(datos.email)

        override suspend fun iniciarSesion(email: String, contrasena: String) = inicio

        override suspend fun cuentaActual() = actual

        override suspend fun cerrarSesion() = cierre

        override suspend fun reenviarVerificacion(email: String) = Resultado.Exito(Unit)

        override suspend fun pedirRecuperacion(email: String) = Resultado.Exito(Unit)
    }

    /** En estos tests el cifrado no importa: lo prueba core:datastore. */
    private object SinCifrar : Cifrador {
        override fun cifrar(datos: ByteArray) = datos

        override fun descifrar(datos: ByteArray) = datos
    }

    private fun TestScope.repositorio(red: RedFalsa): Pair<DefaultCuentasRepository, SesionLocal> {
        val local = SesionLocal(
            DataStoreFactory.create(
                serializer = SerializadorDeSesion(SinCifrar),
                scope = backgroundScope,
                produceFile = { Files.createTempDirectory("sesion").toFile().resolve("sesion") }
            )
        )
        return DefaultCuentasRepository(red, local) to local
    }

    @Test
    fun `RF-005 y RNF-012 - iniciar sesion guarda el token y la cuenta en el dispositivo`() =
        runTest {
            val red = RedFalsa().apply { inicio = Resultado.Exito(SesionDeRed("abc", cuenta)) }
            val (repositorio, local) = repositorio(red)

            repositorio.sesion.test {
                assertEquals(Sesion.SinSesion, awaitItem())
                assertEquals(
                    Resultado.Exito(cuenta),
                    repositorio.iniciarSesion("ana@mail.com", "clave")
                )
                assertEquals(Sesion.Iniciada(cuenta), awaitItem())
            }
            assertEquals("abc", TokenDeSesionLocal(local).tokenActual())
        }

    @Test
    fun `RF-005 - un inicio fallido no guarda nada`() = runTest {
        val red = RedFalsa().apply {
            inicio =
                Resultado.Fallo(ErrorDeApi.Api("credenciales-invalidas"))
        }
        val (repositorio, local) = repositorio(red)

        repositorio.iniciarSesion("ana@mail.com", "mala")

        assertNull(local.cargar())
    }

    @Test
    fun `RF-004 - actualizar trae la cuenta verificada`() = runTest {
        val red = RedFalsa().apply { inicio = Resultado.Exito(SesionDeRed("abc", cuenta)) }
        val (repositorio, _) = repositorio(red)
        repositorio.iniciarSesion("ana@mail.com", "clave")
        val activa = cuenta.copy(estado = EstadoDeCuenta.Activa)
        red.actual = Resultado.Exito(activa)

        repositorio.actualizarCuenta()

        repositorio.sesion.test { assertEquals(Sesion.Iniciada(activa), awaitItem()) }
    }

    @Test
    fun `RNF-012 - si la API ya no reconoce la sesion, se borra`() = runTest {
        val red = RedFalsa().apply { inicio = Resultado.Exito(SesionDeRed("abc", cuenta)) }
        val (repositorio, local) = repositorio(red)
        repositorio.iniciarSesion("ana@mail.com", "clave")
        red.actual = Resultado.Fallo(ErrorDeApi.Api("sin-sesion"))

        repositorio.actualizarCuenta()

        assertNull(local.cargar())
    }

    @Test
    fun `RNF-022 - sin red se mantiene la sesion guardada`() = runTest {
        val red = RedFalsa().apply { inicio = Resultado.Exito(SesionDeRed("abc", cuenta)) }
        val (repositorio, local) = repositorio(red)
        repositorio.iniciarSesion("ana@mail.com", "clave")
        red.actual = Resultado.Fallo(ErrorDeApi.SinConexion)

        repositorio.actualizarCuenta()

        assertEquals("abc", local.cargar()?.token)
    }

    @Test
    fun `RF-007 - cerrar sesion borra el token y la cuenta del dispositivo`() = runTest {
        val red = RedFalsa().apply { inicio = Resultado.Exito(SesionDeRed("abc", cuenta)) }
        val (repositorio, local) = repositorio(red)
        repositorio.iniciarSesion("ana@mail.com", "clave")

        assertEquals(Resultado.Exito(Unit), repositorio.cerrarSesion())

        assertNull(local.cargar())
        assertNull(TokenDeSesionLocal(local).tokenActual())
    }

    @Test
    fun `RF-007 - sin red no se cierra la sesion y se avisa`() = runTest {
        val red = RedFalsa().apply {
            inicio = Resultado.Exito(SesionDeRed("abc", cuenta))
            cierre = Resultado.Fallo(ErrorDeApi.SinConexion)
        }
        val (repositorio, local) = repositorio(red)
        repositorio.iniciarSesion("ana@mail.com", "clave")

        assertEquals(Resultado.Fallo(ErrorDeApi.SinConexion), repositorio.cerrarSesion())
        assertEquals("abc", local.cargar()?.token)
    }
}
