package com.canchitas.core.datastore

import kotlinx.serialization.Serializable

/**
 * Lo que queda en el dispositivo entre aperturas de la app: el bearer (RNF-012) y la última
 * cuenta conocida, para mostrarla sin red. Se guarda cifrado (ADR 0009).
 */
@Serializable
data class SesionGuardada(
    val token: String,
    val cuentaId: String,
    val email: String,
    val nombreUsuario: String,
    val verificada: Boolean
)

/** Estado del archivo: sin sesión es el valor por defecto de DataStore. */
@Serializable
data class ArchivoDeSesion(val sesion: SesionGuardada? = null)
