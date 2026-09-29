package com.canchitas.core.model

/** Cuenta de quien tiene la sesión (RF-001 a RF-007). */
data class Cuenta(
    val id: String,
    val email: String,
    val nombreUsuario: String,
    val estado: EstadoDeCuenta
)

/** RF-004: "Sin verificar" hasta abrir el enlace del mail; después, "Activa". */
enum class EstadoDeCuenta { SinVerificar, Activa }

/** Lo que la app sabe de la sesión en este dispositivo. */
sealed interface Sesion {
    data object SinSesion : Sesion

    data class Iniciada(val cuenta: Cuenta) : Sesion
}

/** Datos del alta (RF-001, RF-002, RF-003, RNF-018). La API valida y decide. */
data class DatosDeAlta(
    val email: String,
    val contrasena: String,
    val nombreUsuario: String,
    /** AAAA-MM-DD */
    val fechaNacimiento: String,
    val aceptaPrivacidad: Boolean
)
