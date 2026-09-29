package com.canchitas.core.model

import kotlin.time.Instant

/** Estado de la API según GET /v1/salud. */
sealed interface EstadoDeLaApi {
    data class EnLinea(val version: String, val instante: Instant) : EstadoDeLaApi

    /** La API responde, pero la base de datos no (503 servicio-no-disponible). */
    data object BaseCaida : EstadoDeLaApi

    /** No hubo respuesta de la API o no se pudo interpretar. */
    data object SinConexion : EstadoDeLaApi
}
