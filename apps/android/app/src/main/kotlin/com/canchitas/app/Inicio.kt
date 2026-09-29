package com.canchitas.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.feature.cuentas.cuenta.CuentaRoute
import com.canchitas.feature.salud.SaludRoute
import kotlinx.serialization.Serializable

@Serializable
data object InicioDestino

/** Inicio con sesión: la cuenta (RF-004, RF-007) y el estado del servicio (M0). */
fun NavGraphBuilder.inicioScreen() {
    composable<InicioDestino> { Inicio() }
}

@Composable
private fun Inicio() {
    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
            CuentaRoute(modifier = Modifier.padding(start = Spacing.lg, end = Spacing.lg, top = Spacing.lg))
            SaludRoute()
        }
    }
}
