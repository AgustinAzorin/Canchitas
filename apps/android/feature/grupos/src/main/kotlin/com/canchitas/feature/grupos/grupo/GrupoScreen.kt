package com.canchitas.feature.grupos.grupo

import android.content.Intent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.core.model.AccionDeGrupo
import com.canchitas.core.model.Grupo
import com.canchitas.core.ui.Aviso
import com.canchitas.core.ui.BotonPrincipal
import com.canchitas.core.ui.BotonSecundario
import com.canchitas.core.ui.Enlace
import com.canchitas.core.ui.MarcoDePantalla
import com.canchitas.core.ui.TipoDeAviso
import com.canchitas.feature.grupos.R
import com.canchitas.feature.grupos.mensajeDe
import com.canchitas.feature.grupos.textoDe

@Composable
fun GrupoRoute(
    onVolver: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: GrupoViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val contexto = LocalContext.current
    val tituloDeCompartir = stringResource(R.string.feature_grupos_compartir_titulo)
    val grupo = (uiState as? GrupoUiState.Success)?.grupo
    val textoDeCompartir = grupo?.link?.let {
        stringResource(R.string.feature_grupos_compartir_texto, grupo.nombre, it)
    }
    GrupoScreen(
        uiState = uiState,
        acciones = AccionesDeGrupo(
            onVolver = onVolver,
            onCompartir = {
                if (textoDeCompartir != null) {
                    // La hoja de compartir de Android: WhatsApp, mail, copiar (RF-011).
                    val envio = Intent(Intent.ACTION_SEND)
                        .setType("text/plain")
                        .putExtra(Intent.EXTRA_TEXT, textoDeCompartir)
                    contexto.startActivity(Intent.createChooser(envio, tituloDeCompartir))
                }
            },
            onPedirRegeneracion = viewModel::onPedirRegeneracion,
            onConfirmarRegeneracion = viewModel::onConfirmarRegeneracion,
            onCancelarRegeneracion = viewModel::onCancelarRegeneracion
        ),
        modifier = modifier
    )
}

data class AccionesDeGrupo(
    val onVolver: () -> Unit = {},
    val onCompartir: () -> Unit = {},
    val onPedirRegeneracion: () -> Unit = {},
    val onConfirmarRegeneracion: () -> Unit = {},
    val onCancelarRegeneracion: () -> Unit = {}
)

@Composable
fun GrupoScreen(uiState: GrupoUiState, acciones: AccionesDeGrupo, modifier: Modifier = Modifier) {
    val titulo = (uiState as? GrupoUiState.Success)?.grupo?.nombre.orEmpty()
    MarcoDePantalla(titulo = titulo, modifier = modifier) {
        when (uiState) {
            GrupoUiState.Loading ->
                Text(
                    text = stringResource(R.string.feature_grupos_consultando_grupo),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )

            is GrupoUiState.Error -> Aviso(
                TipoDeAviso.Error,
                stringResource(mensajeDe(uiState.error))
            )

            is GrupoUiState.Success -> Contenido(uiState, acciones)
        }
        Enlace(stringResource(R.string.feature_grupos_volver), acciones.onVolver)
    }
}

@Composable
private fun Contenido(estado: GrupoUiState.Success, acciones: AccionesDeGrupo) {
    val grupo = estado.grupo
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        Text(
            text = pluralStringResource(
                R.plurals.feature_grupos_miembros,
                grupo.cantidadMiembros,
                grupo.cantidadMiembros
            ) + " · " +
                stringResource(R.string.feature_grupos_tu_rol, stringResource(textoDe(grupo.rol))),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        val link = grupo.link
        if (link == null) {
            Text(
                text = stringResource(R.string.feature_grupos_sin_link),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        } else {
            LinkDeInvitacion(grupo, link, estado, acciones)
        }
    }
    if (estado.regeneracion == EstadoDeRegeneracion.Confirmando) {
        ConfirmarRegeneracion(acciones)
    }
}

@Composable
private fun LinkDeInvitacion(
    grupo: Grupo,
    link: String,
    estado: GrupoUiState.Success,
    acciones: AccionesDeGrupo
) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
        Text(
            text = stringResource(R.string.feature_grupos_link_titulo),
            style = MaterialTheme.typography.titleMedium,
            modifier = Modifier.semantics { heading() }
        )
        Text(
            text = stringResource(R.string.feature_grupos_link_ayuda),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = link,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(Spacing.md)
            )
        }
        if (estado.regeneracion == EstadoDeRegeneracion.Regenerado) {
            Aviso(TipoDeAviso.Exito, stringResource(R.string.feature_grupos_regenerado))
        }
        estado.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
        BotonPrincipal(
            texto = stringResource(R.string.feature_grupos_compartir),
            cargando = false,
            onClick = acciones.onCompartir
        )
        if (AccionDeGrupo.RegenerarLink in grupo.acciones) {
            BotonSecundario(
                texto = stringResource(R.string.feature_grupos_regenerar),
                onClick = acciones.onPedirRegeneracion,
                cargando = estado.regeneracion == EstadoDeRegeneracion.Regenerando,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

/** RF-012: regenerar invalida el link anterior, así que se confirma antes. */
@Composable
private fun ConfirmarRegeneracion(acciones: AccionesDeGrupo) {
    AlertDialog(
        onDismissRequest = acciones.onCancelarRegeneracion,
        shape = MaterialTheme.shapes.extraLarge,
        title = { Text(stringResource(R.string.feature_grupos_regenerar_titulo)) },
        text = { Text(stringResource(R.string.feature_grupos_regenerar_aviso)) },
        confirmButton = {
            TextButton(
                onClick = acciones.onConfirmarRegeneracion,
                shape = MaterialTheme.shapes.medium
            ) {
                Text(stringResource(R.string.feature_grupos_regenerar_confirmar))
            }
        },
        dismissButton = {
            TextButton(
                onClick = acciones.onCancelarRegeneracion,
                shape = MaterialTheme.shapes.medium
            ) {
                Text(stringResource(R.string.feature_grupos_regenerar_cancelar))
            }
        }
    )
}
