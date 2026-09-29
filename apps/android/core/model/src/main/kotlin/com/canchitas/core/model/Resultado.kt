package com.canchitas.core.model

/** Resultado de una operación contra la API: la app no tiene reglas propias (ADR 0011). */
sealed interface Resultado<out T> {
    data class Exito<out T>(val valor: T) : Resultado<T>

    data class Fallo(val error: ErrorDeApi) : Resultado<Nothing>
}

/** Por qué falló: el `type` del problem+json (ADR 0008), la red o algo inesperado. */
sealed interface ErrorDeApi {
    /** Sufijo del `type`: `email-en-uso`, `cuenta-bloqueada`, `sin-sesion`… */
    data class Api(val codigo: String) : ErrorDeApi

    data object SinConexion : ErrorDeApi

    data object Inesperado : ErrorDeApi
}
