package com.canchitas.app

import android.content.Intent
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
import com.canchitas.feature.grupos.navigation.GrupoDestino
import com.canchitas.feature.grupos.navigation.InvitacionDestino
import com.canchitas.feature.grupos.navigation.gruposGraph
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private val viewModel: MainActivityViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Al recrearse, el link ya se procesó y quedó en el SavedStateHandle.
        if (savedInstanceState == null) viewModel.onLink(intent?.dataString)
        enableEdgeToEdge()
        setContent {
            CanchitasTheme {
                val uiState by viewModel.uiState.collectAsStateWithLifecycle()
                val invitacion by viewModel.invitacionPendiente.collectAsStateWithLifecycle()
                val estado = uiState
                if (estado is MainActivityUiState.Success) {
                    CanchitasApp(
                        conSesion = estado.conSesion,
                        invitacionPendiente = invitacion,
                        onInvitacionAbierta = viewModel::onInvitacionAbierta
                    )
                }
            }
        }
    }

    /** RF-011: la app ya estaba abierta y llega un link de invitación. */
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        viewModel.onLink(intent.dataString)
    }
}

@Composable
private fun CanchitasApp(
    conSesion: Boolean,
    invitacionPendiente: String?,
    onInvitacionAbierta: () -> Unit,
    navController: NavHostController = rememberNavController()
) {
    // RF-007 y RNF-012: si la sesión se cierra (o vence) se vuelve al ingreso sin dejar nada atrás.
    LaunchedEffect(conSesion) {
        val destino: Any = if (conSesion) Inicio else IngresoDestino
        navController.navigate(destino) { popUpTo(0) { inclusive = true } }
    }
    // RF-011 y RN-27: el link de invitación se abre recién con sesión.
    LaunchedEffect(conSesion, invitacionPendiente) {
        if (conSesion && invitacionPendiente != null) {
            navController.navigate(InvitacionDestino(invitacionPendiente))
            onInvitacionAbierta()
        }
    }
    NavHost(
        navController = navController,
        startDestination = if (conSesion) Inicio else IngresoDestino,
        modifier = Modifier.safeDrawingPadding()
    ) {
        cuentasGraph(
            navController = navController,
            onIngresado = {},
            conInvitacion = { invitacionPendiente != null }
        )
        inicioScreen(onAbrirGrupo = { navController.navigate(GrupoDestino(it)) })
        gruposGraph(
            navController = navController,
            onIrAlInicio = { navController.navigate(Inicio) { popUpTo(0) { inclusive = true } } }
        )
    }
}
