package com.canchitas.app

import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.network.cuentas.RetrofitCuentasNetwork
import com.canchitas.core.network.di.NetworkModule
import com.canchitas.core.network.generated.apis.CuentasApi
import com.canchitas.core.network.sesion.InterceptorDeSesion
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * RF-001, RF-005, RNF-012 y RF-007 de punta a punta: el cliente generado y la fuente de red reales
 * contra la API local. Corre si CANCHITAS_API_URL apunta a la API (p. ej. http://localhost:8080/).
 */
class CuentasContraApiLocalTest {
    @Test
    fun `RF-001 RF-005 RNF-012 RF-007 - alta, sesion con bearer y cierre contra la API local`() =
        runBlocking {
            val url = System.getenv("CANCHITAS_API_URL")
            assumeTrue("Definí CANCHITAS_API_URL para correr contra la API local", url != null)
            var token: String? = null
            val cliente = OkHttpClient.Builder().addInterceptor(
                InterceptorDeSesion {
                    token
                }
            ).build()
            val json = NetworkModule.providesJson()
            val retrofit = NetworkModule.crearRetrofit(requireNotNull(url), json, cliente)
            val red = RetrofitCuentasNetwork(retrofit.create(CuentasApi::class.java), json)
            val sufijo = System.currentTimeMillis().toString(36)
            val email = "android.$sufijo@mail.com"

            val alta = red.registrar(
                DatosDeAlta(email, "una-contrasena", "and_$sufijo", "1995-05-20", true)
            )
            assertEquals(Resultado.Exito(email), alta)

            val inicio = red.iniciarSesion(email, "una-contrasena")
            check(inicio is Resultado.Exito) { "No inició sesión: $inicio" }
            token = inicio.valor.token

            val actual = red.cuentaActual()
            check(actual is Resultado.Exito)
            assertEquals(EstadoDeCuenta.SinVerificar, actual.valor.estado)

            assertEquals(Resultado.Exito(Unit), red.cerrarSesion())
            assertEquals(Resultado.Fallo(ErrorDeApi.Api("sin-sesion")), red.cuentaActual())
        }
}
