package com.canchitas.feature.grupos

import androidx.annotation.StringRes
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.RolEnGrupo

/** Texto para un error de la API o de la red, según el `type` del problem+json (ADR 0008). */
@StringRes
internal fun mensajeDe(error: ErrorDeApi): Int = when (error) {
    ErrorDeApi.SinConexion -> R.string.feature_grupos_error_sin_conexion

    ErrorDeApi.Inesperado -> R.string.feature_grupos_error_inesperado

    is ErrorDeApi.Api -> when (error.codigo) {
        "nombre-de-grupo-invalido" -> R.string.feature_grupos_error_nombre_invalido
        "cuenta-sin-verificar" -> R.string.feature_grupos_error_sin_verificar
        "grupo-no-encontrado" -> R.string.feature_grupos_error_no_encontrado
        "requiere-admin" -> R.string.feature_grupos_error_requiere_admin
        "expulsado-del-grupo" -> R.string.feature_grupos_error_expulsado
        "link-invalido" -> R.string.feature_grupos_error_link_invalido
        "sin-sesion" -> R.string.feature_grupos_error_sin_sesion
        else -> R.string.feature_grupos_error_inesperado
    }
}

@StringRes
internal fun textoDe(rol: RolEnGrupo): Int = when (rol) {
    RolEnGrupo.Admin -> R.string.feature_grupos_rol_admin
    RolEnGrupo.Jugador -> R.string.feature_grupos_rol_jugador
}

/** Validación del nombre solo para la experiencia: la API decide (RF-010). */
@StringRes
internal fun validarNombreDeGrupo(nombre: String): Int? = when {
    nombre.isBlank() -> R.string.feature_grupos_obligatorio
    nombre.trim().length > LARGO_MAXIMO -> R.string.feature_grupos_nombre_largo
    else -> null
}

private const val LARGO_MAXIMO = 60
