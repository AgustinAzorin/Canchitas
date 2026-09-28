package com.canchitas.feature.salud

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.icon.CanchitasIcons
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.core.designsystem.theme.Spacing

@Composable
fun SaludRoute(modifier: Modifier = Modifier, viewModel: SaludViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    SaludScreen(uiState = uiState, modifier = modifier)
}

@Composable
fun SaludScreen(uiState: SaludUiState, modifier: Modifier = Modifier) {
    Surface(modifier = modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier.padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.xl)
        ) {
            Text(
                text = stringResource(R.string.feature_salud_titulo),
                style = MaterialTheme.typography.headlineMedium
            )
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = MaterialTheme.shapes.large,
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)
            ) {
                Column(
                    modifier = Modifier
                        .padding(Spacing.lg)
                        .semantics { liveRegion = LiveRegionMode.Polite },
                    verticalArrangement = Arrangement.spacedBy(Spacing.sm)
                ) {
                    when (uiState) {
                        SaludUiState.Loading -> Consultando()
                        is SaludUiState.Success -> EnLinea(uiState)
                        is SaludUiState.Error -> ConError(uiState.motivo)
                    }
                }
            }
        }
    }
}

@Composable
private fun Consultando() {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
        Text(
            text = stringResource(R.string.feature_salud_consultando),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun EnLinea(estado: SaludUiState.Success) {
    Aviso(
        icono = CanchitasIcons.CheckCircle,
        color = CanchitasTheme.extendedColors.success,
        texto = stringResource(R.string.feature_salud_en_linea)
    )
    Dato(etiqueta = stringResource(R.string.feature_salud_version), valor = estado.version)
    Dato(
        etiqueta = stringResource(R.string.feature_salud_hora_del_servidor),
        valor = estado.horaDelServidor
    )
}

@Composable
private fun Dato(etiqueta: String, valor: String) {
    Row {
        Text(
            text = etiqueta,
            modifier = Modifier.width(140.dp),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = valor,
            style = MaterialTheme.typography.bodySmall.copy(fontFeatureSettings = "tnum")
        )
    }
}

@Composable
private fun ConError(motivo: SaludUiState.Motivo) {
    val texto = when (motivo) {
        SaludUiState.Motivo.BaseCaida -> R.string.feature_salud_base_caida
        SaludUiState.Motivo.SinConexion -> R.string.feature_salud_sin_conexion
    }
    Aviso(
        icono = CanchitasIcons.Error,
        color = MaterialTheme.colorScheme.error,
        texto = stringResource(texto)
    )
}

/** El estado siempre lleva texto; el ícono y el color lo refuerzan (GUIDELINES, principio 5). */
@Composable
private fun Aviso(icono: Int, color: Color, texto: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        Icon(
            painter = painterResource(icono),
            contentDescription = null,
            modifier = Modifier.size(16.dp),
            tint = color
        )
        Text(text = texto, style = MaterialTheme.typography.bodySmall)
    }
}

@Preview
@Composable
private fun SaludScreenEnLineaPreview() {
    CanchitasTheme {
        SaludScreen(SaludUiState.Success(version = "1.4.0", horaDelServidor = "vie 09/10 · 23:00"))
    }
}
