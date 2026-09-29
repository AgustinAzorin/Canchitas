package com.canchitas.feature.cuentas.navigation

import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.canchitas.feature.cuentas.ingreso.IngresoRoute
import com.canchitas.feature.cuentas.privacidad.PrivacidadScreen
import com.canchitas.feature.cuentas.recuperacion.RecuperacionRoute
import com.canchitas.feature.cuentas.registro.RegistroRoute
import kotlinx.serialization.Serializable

@Serializable
data object IngresoDestino

@Serializable
data object RegistroDestino

@Serializable
data object RecuperacionDestino

@Serializable
data object PrivacidadDestino

/** Pantallas sin sesión: ingreso, registro, recuperación y política de privacidad. */
fun NavGraphBuilder.cuentasGraph(navController: NavController, onIngresado: () -> Unit) {
    composable<IngresoDestino> {
        IngresoRoute(
            onIngresado = onIngresado,
            onRegistrarse = { navController.navigate(RegistroDestino) },
            onRecuperar = { navController.navigate(RecuperacionDestino) }
        )
    }
    composable<RegistroDestino> {
        RegistroRoute(
            onIngresar = {
                navController.navigate(IngresoDestino) {
                    popUpTo(IngresoDestino) {
                        inclusive =
                            true
                    }
                }
            },
            onVerPrivacidad = { navController.navigate(PrivacidadDestino) }
        )
    }
    composable<RecuperacionDestino> {
        RecuperacionRoute(onVolver = { navController.popBackStack() })
    }
    composable<PrivacidadDestino> { PrivacidadScreen(onVolver = { navController.popBackStack() }) }
}
