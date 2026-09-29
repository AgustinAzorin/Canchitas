package com.canchitas.feature.cuentas.cuenta

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.feature.cuentas.EstadoDeReenvio
import com.canchitas.feature.cuentas.R
import com.canchitas.feature.cuentas.componentes.Aviso
import com.canchitas.feature.cuentas.componentes.BotonSecundario
import com.canchitas.feature.cuentas.componentes.TipoDeAviso
import com.canchitas.feature.cuentas.mensajeDe

/** Sección de la cuenta para el inicio: quién tiene la sesión, verificación y cierre de sesión. */
@Composable
fun CuentaRoute(modifier: Modifier = Modifier, viewModel: CuentaViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    CuentaSection(
        uiState = uiState,
        onCerrarSesion = viewModel::onCerrarSesion,
        onReenviar = viewModel::onReenviar,
        modifier = modifier
    )
}

@Composable
fun CuentaSection(
    uiState: CuentaUiState,
    onCerrarSesion: () -> Unit,
    onReenviar: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        when (uiState) {
            CuentaUiState.Loading, CuentaUiState.SinSesion -> {
                val descripcion = stringResource(R.string.feature_cuentas_consultando)
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(16.dp)
                        .semantics { contentDescription = descripcion },
                    strokeWidth = 2.dp
                )
            }

            is CuentaUiState.ConSesion -> ConSesion(uiState, onCerrarSesion, onReenviar)
        }
    }
}

@Composable
private fun ConSesion(
    estado: CuentaUiState.ConSesion,
    onCerrarSesion: () -> Unit,
    onReenviar: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        Text(
            text = stringResource(R.string.feature_cuentas_hola, estado.cuenta.nombreUsuario),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier
                .weight(1f)
                .semantics { heading() }
        )
        BotonSecundario(
            texto = stringResource(R.string.feature_cuentas_cerrar_sesion),
            onClick = onCerrarSesion,
            cargando = estado.cerrando
        )
    }
    estado.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
    if (estado.cuenta.estado == EstadoDeCuenta.SinVerificar) {
        Aviso(
            tipo = TipoDeAviso.Advertencia,
            texto = stringResource(
                if (estado.reenvio == EstadoDeReenvio.Enviado) {
                    R.string.feature_cuentas_reenviado
                } else {
                    R.string.feature_cuentas_sin_verificar
                }
            )
        ) {
            if (estado.reenvio != EstadoDeReenvio.Enviado) {
                BotonSecundario(
                    texto = stringResource(R.string.feature_cuentas_reenviar),
                    onClick = onReenviar,
                    cargando = estado.reenvio == EstadoDeReenvio.Enviando,
                    colorDelContenido = LocalContentColor.current
                )
            }
        }
    }
}
