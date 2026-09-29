package com.canchitas.feature.cuentas

import androidx.annotation.StringRes
import com.canchitas.core.model.ErrorDeApi

/** Texto para un error de la API o de la red, según el `type` del problem+json (ADR 0008). */
@StringRes
internal fun mensajeDe(error: ErrorDeApi): Int = when (error) {
    ErrorDeApi.SinConexion -> R.string.feature_cuentas_error_sin_conexion

    ErrorDeApi.Inesperado -> R.string.feature_cuentas_error_inesperado

    is ErrorDeApi.Api -> when (error.codigo) {
        "email-en-uso" -> R.string.feature_cuentas_error_email_en_uso
        "nombre-de-usuario-en-uso" -> R.string.feature_cuentas_error_nombre_en_uso
        "nombre-de-usuario-invalido" -> R.string.feature_cuentas_validacion_nombre_usuario
        "menor-de-edad" -> R.string.feature_cuentas_error_menor_de_edad
        "fecha-invalida" -> R.string.feature_cuentas_error_fecha_invalida
        "privacidad-no-aceptada" -> R.string.feature_cuentas_validacion_privacidad
        "credenciales-invalidas" -> R.string.feature_cuentas_error_credenciales
        "cuenta-bloqueada" -> R.string.feature_cuentas_error_bloqueada
        "solicitud-invalida" -> R.string.feature_cuentas_error_solicitud_invalida
        else -> R.string.feature_cuentas_error_inesperado
    }
}

/** Validación de formularios solo para la experiencia: la API vuelve a validar y decide. */
internal object Validacion {
    private val formatoDeEmail = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    private val formatoDeNombre = Regex("^[a-zA-Z0-9_.]{3,20}$")
    private const val CONTRASENA_MINIMA = 8
    private const val CONTRASENA_MAXIMA = 128

    @StringRes
    fun email(email: String): Int? = when {
        email.isBlank() -> R.string.feature_cuentas_obligatorio
        !formatoDeEmail.matches(email.trim()) -> R.string.feature_cuentas_validacion_email
        else -> null
    }

    @StringRes
    fun contrasenaNueva(contrasena: String): Int? = when {
        contrasena.isEmpty() -> R.string.feature_cuentas_obligatorio

        contrasena.length < CONTRASENA_MINIMA ->
            R.string.feature_cuentas_validacion_contrasena_corta

        contrasena.length > CONTRASENA_MAXIMA ->
            R.string.feature_cuentas_validacion_contrasena_larga

        else -> null
    }

    @StringRes
    fun nombreDeUsuario(nombre: String): Int? = when {
        nombre.isBlank() -> R.string.feature_cuentas_obligatorio

        !formatoDeNombre.matches(
            nombre.trim()
        ) -> R.string.feature_cuentas_validacion_nombre_usuario

        else -> null
    }
}

/** Estado del botón "Reenviar mail" (RF-004). */
enum class EstadoDeReenvio { Inicial, Enviando, Enviado }
