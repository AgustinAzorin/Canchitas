package com.canchitas.core.network.sesion

import okhttp3.Interceptor
import okhttp3.Response

/** El bearer de la sesión de este dispositivo, si hay (RNF-012). Lo implementa core:data. */
fun interface ProveedorDeToken {
    fun tokenActual(): String?
}

/** Agrega `Authorization: Bearer` a cada pedido cuando hay sesión (ADR 0009). */
class InterceptorDeSesion(private val proveedor: ProveedorDeToken) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = proveedor.tokenActual()
        val pedido = chain.request()
        return chain.proceed(
            if (token ==
                null
            ) {
                pedido
            } else {
                pedido.newBuilder().header("Authorization", "Bearer $token").build()
            }
        )
    }
}
