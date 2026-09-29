package com.canchitas.feature.cuentas.recuperacion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
fun RecuperacionRoute(
    onVolver: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RecuperacionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    RecuperacionScreen(
        uiState = uiState,
        onEmail = viewModel::onEmail,
        onEnviar = viewModel::onEnviar,
        onVolver = onVolver,
        modifier = modifier
    )
}

@Composable
fun RecuperacionScreen(
    uiState: RecuperacionUiState,
    onEmail: (String) -> Unit,
    onEnviar: () -> Unit,
    onVolver: () -> Unit,
    modifier: Modifier = Modifier
) {
    MarcoDeCuenta(titulo = stringResource(R.string.feature_cuentas_recuperacion_titulo), modifier = modifier) {
        Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
            Text(
                stringResource(R.string.feature_cuentas_recuperacion_explicacion),
                style = MaterialTheme.typography.bodyMedium
            )
            when (uiState) {
                RecuperacionUiState.Enviado ->
                    Aviso(TipoDeAviso.Info, stringResource(R.string.feature_cuentas_recuperacion_enviado))

                is RecuperacionUiState.Editando -> {
                    uiState.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
                    CampoDeTexto(
                        valor = uiState.email,
                        onCambio = onEmail,
                        etiqueta = stringResource(R.string.feature_cuentas_campo_email),
                        error = uiState.errorDeCampo?.let { stringResource(it) },
                        tipo = KeyboardType.Email,
                        habilitado = !uiState.enviando
                    )
                    BotonPrincipal(
                        texto = stringResource(R.string.feature_cuentas_recuperacion_enviar),
                        cargando = uiState.enviando,
                        onClick = onEnviar
                    )
                }
            }
            Enlace(stringResource(R.string.feature_cuentas_volver_a_ingresar), onVolver)
        }
    }
}
