package com.canchitas.app

import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.core.network.LlamadorDeApi
import com.canchitas.core.network.cuentas.RetrofitCuentasNetwork
import com.canchitas.core.network.di.NetworkModule
import com.canchitas.core.network.generated.apis.CuentasApi
import com.canchitas.core.network.generated.apis.GruposApi
import com.canchitas.core.network.grupos.RetrofitGruposNetwork
import com.canchitas.core.network.sesion.InterceptorDeSesion
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assume.assumeTrue
import org.junit.Test

/**
 * RF-010, RF-011 y RF-004 contra la API local: el cliente generado y la fuente de red reales.
 * Corre si CANCHITAS_API_URL apunta a la API (p. ej. http://localhost:8080/). La cuenta queda sin
 * verificar (el mail va a Mailpit), así que se prueban los rechazos; el camino completo lo cubren
 * los tests de la API y los E2E de la web.
 */
class GruposContraApiLocalTest {
    @Test
    fun `RF-010 RF-011 RF-004 - sin verificar no crea grupos y un link falso no es valido`() =
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
            val llamador = LlamadorDeApi(json)
            val cuentas = RetrofitCuentasNetwork(retrofit.create(CuentasApi::class.java), llamador)
            val grupos = RetrofitGruposNetwork(retrofit.create(GruposApi::class.java), llamador)
            val sufijo = System.currentTimeMillis().toString(36)
            val email = "android.grupos.$sufijo@mail.com"

            assertEquals(Resultado.Fallo(ErrorDeApi.Api("sin-sesion")), grupos.misGrupos())

            cuentas.registrar(
                DatosDeAlta(email, "una-contrasena", "gr_$sufijo", "1995-05-20", true)
            )
            val inicio = cuentas.iniciarSesion(email, "una-contrasena")
            check(inicio is Resultado.Exito) { "No inició sesión: $inicio" }
            token = inicio.valor.token

            assertEquals(Resultado.Exito(emptyList<Any>()), grupos.misGrupos())
            assertEquals(
                Resultado.Fallo(ErrorDeApi.Api("cuenta-sin-verificar")),
                grupos.crearGrupo("Los del jueves")
            )
            assertEquals(
                Resultado.Fallo(ErrorDeApi.Api("link-invalido")),
                grupos.invitacion("no-existe")
            )
            assertEquals(
                Resultado.Fallo(ErrorDeApi.Api("grupo-no-encontrado")),
                grupos.grupo("00000000-0000-4000-8000-000000000000")
            )
        }
}
