package com.canchitas.feature.salud.navigation

import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.canchitas.feature.salud.SaludRoute
import kotlinx.serialization.Serializable

@Serializable
data object SaludDestino

fun NavGraphBuilder.saludScreen() {
    composable<SaludDestino> { SaludRoute() }
}
