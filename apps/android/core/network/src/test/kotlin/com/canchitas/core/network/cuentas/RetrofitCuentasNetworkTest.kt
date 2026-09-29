package com.canchitas.core.network.cuentas

import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.network.LlamadorDeApi
import com.canchitas.core.network.di.NetworkModule
import com.canchitas.core.network.generated.apis.CuentasApi
import com.canchitas.core.network.sesion.InterceptorDeSesion
import kotlinx.coroutines.test.runTest
import mockwebserver3.MockResponse
import mockwebserver3.MockWebServer
import okhttp3.OkHttpClient
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Before
import org.junit.Test

class RetrofitCuentasNetworkTest {
    private val servidor = MockWebServer()
    private val json = NetworkModule.providesJson()
    private var token: String? = null
    private lateinit var network: RetrofitCuentasNetwork

    @Before
    fun iniciar() {
        servidor.start()
        val cliente = OkHttpClient.Builder().addInterceptor(InterceptorDeSesion { token }).build()
        val retrofit = NetworkModule.crearRetrofit(servidor.url("/").toString(), json, cliente)
        network =
            RetrofitCuentasNetwork(retrofit.create(CuentasApi::class.java), LlamadorDeApi(json))
    }

    @After
    fun cerrar() {
        servidor.close()
    }

    private fun responder(codigo: Int, cuerpo: String = "", tipo: String = "application/json") {
        servidor.enqueue(
            MockResponse.Builder().code(codigo).addHeader("Content-Type", tipo).body(cuerpo).build()
        )
    }

    private fun problema(codigo: Int, tipo: String) = responder(
        codigo,
        """{"type":"https://canchitas.app/errores/$tipo","title":"x","status":$codigo}""",
        "application/problem+json"
    )

    private val cuentaJson =
        """{"id":"00000000-0000-4000-8000-000000000001","email":"ana@mail.com",""" +
            """"nombreUsuario":"ana_10","estado":"sin_verificar"}"""
    private val cuenta = Cuenta(
        "00000000-0000-4000-8000-000000000001",
        "ana@mail.com",
        "ana_10",
        EstadoDeCuenta.SinVerificar
    )

    @Test
    fun `RF-001 - el alta manda los datos y devuelve el mail`() = runTest {
        responder(
            201,
            """{"email":"ana@mail.com","nombreUsuario":"ana_10","estado":"sin_verificar"}"""
        )

        val resultado = network.registrar(
            DatosDeAlta("ana@mail.com", "una-clave", "ana_10", "1995-05-20", true)
        )

        assertEquals(Resultado.Exito("ana@mail.com"), resultado)
        val pedido = servidor.takeRequest()
        assertEquals("/v1/cuentas", pedido.url.encodedPath)
        assertEquals(
            """{"email":"ana@mail.com","contrasena":"una-clave","nombreUsuario":"ana_10",""" +
                """"fechaNacimiento":"1995-05-20","aceptaPrivacidad":true}""",
            pedido.body?.utf8()
        )
    }

    @Test
    fun `RF-001 y RF-002 - los errores se leen por el type del problem`() = runTest {
        problema(409, "email-en-uso")
        problema(422, "menor-de-edad")
        val datos = DatosDeAlta("ana@mail.com", "una-clave", "ana_10", "2010-01-01", true)

        assertEquals(Resultado.Fallo(ErrorDeApi.Api("email-en-uso")), network.registrar(datos))
        assertEquals(Resultado.Fallo(ErrorDeApi.Api("menor-de-edad")), network.registrar(datos))
    }

    @Test
    fun `RF-005 y RNF-012 - Android inicia sesion con token, no con cookie`() = runTest {
        responder(200, """{"token":"abc","cuenta":$cuentaJson}""")

        val resultado = network.iniciarSesion("ana@mail.com", "una-clave")

        assertEquals(Resultado.Exito(SesionDeRed("abc", cuenta)), resultado)
        assertEquals("/v1/cuentas/sesion/token", servidor.takeRequest().url.encodedPath)
    }

    @Test
    fun `RNF-011 - el bloqueo llega como cuenta-bloqueada`() = runTest {
        problema(429, "cuenta-bloqueada")
        assertEquals(
            Resultado.Fallo(ErrorDeApi.Api("cuenta-bloqueada")),
            network.iniciarSesion("ana@mail.com", "mala")
        )
    }

    @Test
    fun `RNF-012 - con sesion cada pedido lleva el bearer, sin sesion no`() = runTest {
        responder(200, cuentaJson)
        responder(200, cuentaJson)

        network.cuentaActual()
        token = "abc"
        val resultado = network.cuentaActual()

        assertNull(servidor.takeRequest().headers["Authorization"])
        assertEquals("Bearer abc", servidor.takeRequest().headers["Authorization"])
        assertEquals(Resultado.Exito(cuenta), resultado)
    }

    @Test
    fun `RF-007 - cerrar sesion es DELETE y 204`() = runTest {
        servidor.enqueue(MockResponse.Builder().code(204).build())
        token = "abc"

        assertEquals(Resultado.Exito(Unit), network.cerrarSesion())
        val pedido = servidor.takeRequest()
        assertEquals("DELETE", pedido.method)
        assertEquals("/v1/cuentas/sesion", pedido.url.encodedPath)
    }

    @Test
    fun `sin red el resultado es SinConexion`() = runTest {
        servidor.close()
        assertEquals(
            Resultado.Fallo(ErrorDeApi.SinConexion),
            network.pedirRecuperacion("ana@mail.com")
        )
    }
}
