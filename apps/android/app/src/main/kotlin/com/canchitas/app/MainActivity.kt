package com.canchitas.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.rememberNavController
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.feature.cuentas.navigation.IngresoDestino
import com.canchitas.feature.cuentas.navigation.cuentasGraph
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val viewModel: MainActivityViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CanchitasTheme {
                val uiState by viewModel.uiState.collectAsStateWithLifecycle()
                val estado = uiState
                if (estado is MainActivityUiState.Success) {
                    CanchitasApp(conSesion = estado.conSesion)
                }
            }
        }
    }
}

@Composable
private fun CanchitasApp(
    conSesion: Boolean,
    navController: NavHostController = rememberNavController()
) {
    // RF-007 y RNF-012: si la sesión se cierra (o vence) se vuelve al ingreso sin dejar nada atrás.
    LaunchedEffect(conSesion) {
        val destino: Any = if (conSesion) Inicio else IngresoDestino
        navController.navigate(destino) { popUpTo(0) { inclusive = true } }
    }
    NavHost(
        navController = navController,
        startDestination = if (conSesion) Inicio else IngresoDestino,
        modifier = Modifier.safeDrawingPadding()
    ) {
        cuentasGraph(navController, onIngresado = {})
        inicioScreen()
    }
}
