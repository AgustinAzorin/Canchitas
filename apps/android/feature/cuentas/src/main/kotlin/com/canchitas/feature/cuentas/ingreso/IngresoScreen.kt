package com.canchitas.feature.cuentas.ingreso

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.feature.cuentas.R
import com.canchitas.feature.cuentas.componentes.Aviso
import com.canchitas.feature.cuentas.componentes.BotonPrincipal
import com.canchitas.feature.cuentas.componentes.CampoDeTexto
import com.canchitas.feature.cuentas.componentes.Enlace
import com.canchitas.feature.cuentas.componentes.MarcoDeCuenta
import com.canchitas.feature.cuentas.componentes.TipoDeAviso
import com.canchitas.feature.cuentas.mensajeDe

@Composable
fun IngresoRoute(
    onIngresado: () -> Unit,
    onRegistrarse: () -> Unit,
    onRecuperar: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: IngresoViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(uiState) { if (uiState == IngresoUiState.Ingresado) onIngresado() }
    IngresoScreen(
        uiState = uiState,
        acciones = AccionesDeIngreso(
            onEmail = viewModel::onEmail,
            onContrasena = viewModel::onContrasena,
            onEnviar = viewModel::onEnviar,
            onRegistrarse = onRegistrarse,
            onRecuperar = onRecuperar
        ),
        modifier = modifier
    )
}

data class AccionesDeIngreso(
    val onEmail: (String) -> Unit = {},
    val onContrasena: (String) -> Unit = {},
    val onEnviar: () -> Unit = {},
    val onRegistrarse: () -> Unit = {},
    val onRecuperar: () -> Unit = {}
)

@Composable
fun IngresoScreen(uiState: IngresoUiState, acciones: AccionesDeIngreso, modifier: Modifier = Modifier) {
    MarcoDeCuenta(titulo = stringResource(R.string.feature_cuentas_ingreso_titulo), modifier = modifier) {
        val estado = uiState as? IngresoUiState.Editando ?: IngresoUiState.Editando(enviando = true)
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            estado.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
            CampoDeTexto(
                valor = estado.email,
                onCambio = acciones.onEmail,
                etiqueta = stringResource(R.string.feature_cuentas_campo_email),
                error = estado.errores[CampoDeIngreso.Email]?.let { stringResource(it) },
                tipo = KeyboardType.Email,
                habilitado = !estado.enviando
            )
            CampoDeTexto(
                valor = estado.contrasena,
                onCambio = acciones.onContrasena,
                etiqueta = stringResource(R.string.feature_cuentas_campo_contrasena),
                error = estado.errores[CampoDeIngreso.Contrasena]?.let { stringResource(it) },
                tipo = KeyboardType.Password,
                habilitado = !estado.enviando
            )
            BotonPrincipal(
                texto = stringResource(R.string.feature_cuentas_ingreso_enviar),
                cargando = estado.enviando,
                onClick = acciones.onEnviar
            )
            Enlace(stringResource(R.string.feature_cuentas_ingreso_olvido), acciones.onRecuperar)
            Enlace(stringResource(R.string.feature_cuentas_ingreso_crear_cuenta), acciones.onRegistrarse)
        }
    }
}
