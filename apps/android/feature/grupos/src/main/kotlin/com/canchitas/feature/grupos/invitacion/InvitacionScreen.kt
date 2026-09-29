package com.canchitas.feature.grupos.invitacion

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.core.model.EstadoDeInvitacion
import com.canchitas.core.ui.Aviso
import com.canchitas.core.ui.BotonPrincipal
import com.canchitas.core.ui.BotonSecundario
import com.canchitas.core.ui.Enlace
import com.canchitas.core.ui.MarcoDePantalla
import com.canchitas.core.ui.TipoDeAviso
import com.canchitas.feature.grupos.R
import com.canchitas.feature.grupos.mensajeDe

@Composable
fun InvitacionRoute(
    onIrAlGrupo: (String) -> Unit,
    onIrAlInicio: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: InvitacionViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    LaunchedEffect(uiState) {
        (uiState as? InvitacionUiState.EnElGrupo)?.let { onIrAlGrupo(it.grupoId) }
    }
    InvitacionScreen(
        uiState = uiState,
        acciones = AccionesDeInvitacion(
            onUnirme = viewModel::onUnirme,
            onReenviar = viewModel::onReenviar,
            onReintentar = viewModel::onReintentar,
            onIrAlInicio = onIrAlInicio
        ),
        modifier = modifier
    )
}

data class AccionesDeInvitacion(
    val onUnirme: () -> Unit = {},
    val onReenviar: () -> Unit = {},
    val onReintentar: () -> Unit = {},
    val onIrAlInicio: () -> Unit = {}
)

@Composable
fun InvitacionScreen(
    uiState: InvitacionUiState,
    acciones: AccionesDeInvitacion,
    modifier: Modifier = Modifier
) {
    MarcoDePantalla(
        titulo = stringResource(R.string.feature_grupos_invitacion_titulo),
        modifier = modifier
    ) {
        when (uiState) {
            InvitacionUiState.Loading, is InvitacionUiState.EnElGrupo ->
                Text(
                    text = stringResource(R.string.feature_grupos_invitacion_consultando),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

            is InvitacionUiState.Error -> {
                Aviso(TipoDeAviso.Error, stringResource(mensajeDe(uiState.error)))
                Enlace(
                    stringResource(R.string.feature_grupos_invitacion_ir_al_inicio),
                    acciones.onIrAlInicio
                )
            }

            is InvitacionUiState.Success -> Vista(uiState, acciones)
        }
    }
}

@Composable
private fun Vista(estado: InvitacionUiState.Success, acciones: AccionesDeInvitacion) {
    val invitacion = estado.invitacion
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.xs)) {
        Text(
            text = stringResource(R.string.feature_grupos_invitacion_te_invitan),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            text = invitacion.nombre,
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        Text(
            text = pluralStringResource(
                R.plurals.feature_grupos_miembros,
                invitacion.cantidadMiembros,
                invitacion.cantidadMiembros
            ),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
    estado.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
    when (invitacion.estado) {
        EstadoDeInvitacion.PuedeUnirse, EstadoDeInvitacion.YaEsMiembro ->
            BotonPrincipal(
                texto = stringResource(R.string.feature_grupos_invitacion_unirme),
                cargando = estado.uniendo,
                onClick = acciones.onUnirme
            )

        EstadoDeInvitacion.CuentaSinVerificar -> SinVerificar(estado.reenvio, acciones)

        EstadoDeInvitacion.Expulsado ->
            Aviso(TipoDeAviso.Error, stringResource(R.string.feature_grupos_invitacion_expulsado))
    }
}

/** RF-004: sin verificar no se une, y se ofrece reenviar el mail. */
@Composable
private fun SinVerificar(reenvio: EstadoDeReenvio, acciones: AccionesDeInvitacion) {
    Aviso(
        tipo = TipoDeAviso.Advertencia,
        texto = stringResource(
            if (reenvio == EstadoDeReenvio.Enviado) {
                R.string.feature_grupos_invitacion_reenviado
            } else {
                R.string.feature_grupos_invitacion_sin_verificar
            }
        )
    ) {
        if (reenvio != EstadoDeReenvio.Enviado) {
            BotonSecundario(
                texto = stringResource(R.string.feature_grupos_invitacion_reenviar),
                onClick = acciones.onReenviar,
                cargando = reenvio == EstadoDeReenvio.Enviando,
                colorDelContenido = LocalContentColor.current
            )
        }
    }
    Enlace(stringResource(R.string.feature_grupos_invitacion_ya_verifique), acciones.onReintentar)
}
