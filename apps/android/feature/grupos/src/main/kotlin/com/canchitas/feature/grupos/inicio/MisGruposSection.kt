package com.canchitas.feature.grupos.inicio

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.ui.Aviso
import com.canchitas.core.ui.BotonPrincipal
import com.canchitas.core.ui.CampoDeTexto
import com.canchitas.core.ui.TipoDeAviso
import com.canchitas.feature.grupos.R
import com.canchitas.feature.grupos.mensajeDe
import com.canchitas.feature.grupos.textoDe

/** "Tus grupos" en el inicio (RF-010, RF-011). */
@Composable
fun MisGruposRoute(
    onAbrirGrupo: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: MisGruposViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val creado = (uiState as? MisGruposUiState.Success)?.formulario?.creado
    LaunchedEffect(creado) {
        if (creado != null) {
            viewModel.onNavegado()
            onAbrirGrupo(creado)
        }
    }
    MisGruposSection(
        uiState = uiState,
        acciones = AccionesDeMisGrupos(
            onAbrirGrupo = onAbrirGrupo,
            onNombre = viewModel::onNombre,
            onCrear = viewModel::onCrear
        ),
        modifier = modifier
    )
}

data class AccionesDeMisGrupos(
    val onAbrirGrupo: (String) -> Unit = {},
    val onNombre: (String) -> Unit = {},
    val onCrear: () -> Unit = {}
)

@Composable
fun MisGruposSection(
    uiState: MisGruposUiState,
    acciones: AccionesDeMisGrupos,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(Spacing.md)
    ) {
        Text(
            text = stringResource(R.string.feature_grupos_titulo),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.semantics { heading() }
        )
        when (uiState) {
            MisGruposUiState.Loading -> {
                val descripcion = stringResource(R.string.feature_grupos_consultando)
                CircularProgressIndicator(
                    modifier = Modifier
                        .size(16.dp)
                        .semantics { contentDescription = descripcion },
                    strokeWidth = 2.dp
                )
            }

            is MisGruposUiState.Success -> {
                uiState.errorDeLista?.let {
                    Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it)))
                }
                ListaDeGrupos(uiState.grupos, acciones.onAbrirGrupo)
                FormularioDeCreacion(uiState.formulario, acciones)
            }
        }
    }
}

@Composable
private fun ListaDeGrupos(grupos: List<ResumenDeGrupo>, onAbrirGrupo: (String) -> Unit) {
    if (grupos.isEmpty()) {
        Text(
            text = stringResource(R.string.feature_grupos_ninguno),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        return
    }
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column {
            grupos.forEachIndexed { indice, grupo ->
                if (indice > 0) HorizontalDivider()
                FilaDeGrupo(grupo, onAbrirGrupo)
            }
        }
    }
}

@Composable
private fun FilaDeGrupo(grupo: ResumenDeGrupo, onAbrirGrupo: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 56.dp)
            .clickable(role = Role.Button) { onAbrirGrupo(grupo.id) }
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(grupo.nombre, style = MaterialTheme.typography.titleMedium)
            Text(
                text = pluralStringResource(
                    R.plurals.feature_grupos_miembros,
                    grupo.cantidadMiembros,
                    grupo.cantidadMiembros
                ) + " · " + stringResource(textoDe(grupo.rol)),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun FormularioDeCreacion(formulario: FormularioDeGrupo, acciones: AccionesDeMisGrupos) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text(
            text = stringResource(R.string.feature_grupos_crear_titulo),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() }
        )
        formulario.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
        CampoDeTexto(
            valor = formulario.nombre,
            onCambio = acciones.onNombre,
            etiqueta = stringResource(R.string.feature_grupos_crear_nombre),
            ayuda = stringResource(R.string.feature_grupos_crear_ayuda),
            error = formulario.errorDeCampo?.let { stringResource(it) },
            habilitado = !formulario.creando
        )
        BotonPrincipal(
            texto = stringResource(R.string.feature_grupos_crear_enviar),
            cargando = formulario.creando,
            onClick = acciones.onCrear
        )
    }
}
