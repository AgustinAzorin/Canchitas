package com.canchitas.feature.cuentas.registro

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.selection.toggleable
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.canchitas.core.designsystem.theme.Spacing
import com.canchitas.feature.cuentas.EstadoDeReenvio
import com.canchitas.feature.cuentas.R
import com.canchitas.feature.cuentas.componentes.Aviso
import com.canchitas.feature.cuentas.componentes.BotonPrincipal
import com.canchitas.feature.cuentas.componentes.BotonSecundario
import com.canchitas.feature.cuentas.componentes.CampoDeTexto
import com.canchitas.feature.cuentas.componentes.Enlace
import com.canchitas.feature.cuentas.componentes.FilaCentrada
import com.canchitas.feature.cuentas.componentes.MarcoDeCuenta
import com.canchitas.feature.cuentas.componentes.TipoDeAviso
import com.canchitas.feature.cuentas.mensajeDe
import kotlin.time.Instant
import kotlinx.datetime.LocalDate
import kotlinx.datetime.TimeZone
import kotlinx.datetime.atStartOfDayIn
import kotlinx.datetime.toLocalDateTime

@Composable
fun RegistroRoute(
    onIngresar: () -> Unit,
    onVerPrivacidad: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: RegistroViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    RegistroScreen(
        uiState = uiState,
        acciones = AccionesDeRegistro(
            onCambio = viewModel::onCambio,
            onEnviar = viewModel::onEnviar,
            onReenviar = viewModel::onReenviar,
            onIngresar = onIngresar,
            onVerPrivacidad = onVerPrivacidad
        ),
        modifier = modifier
    )
}

data class AccionesDeRegistro(
    val onCambio: ((FormularioDeRegistro) -> FormularioDeRegistro) -> Unit = {},
    val onEnviar: () -> Unit = {},
    val onReenviar: () -> Unit = {},
    val onIngresar: () -> Unit = {},
    val onVerPrivacidad: () -> Unit = {}
)

@Composable
fun RegistroScreen(
    uiState: RegistroUiState,
    acciones: AccionesDeRegistro,
    modifier: Modifier = Modifier
) {
    MarcoDeCuenta(
        titulo = stringResource(R.string.feature_cuentas_registro_titulo),
        modifier = modifier
    ) {
        when (uiState) {
            is RegistroUiState.Editando -> Formulario(uiState, acciones)
            is RegistroUiState.Listo -> Listo(uiState, acciones)
        }
    }
}

@Composable
private fun Formulario(estado: RegistroUiState.Editando, acciones: AccionesDeRegistro) {
    val formulario = estado.formulario
    val textos = estado.errores.mapValues { (_, texto) -> stringResource(texto) }
    val error = { campo: CampoDeRegistro -> textos[campo] }
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        estado.error?.let { Aviso(TipoDeAviso.Error, stringResource(mensajeDe(it))) }
        CampoDeTexto(
            valor = formulario.email,
            onCambio = { valor -> acciones.onCambio { it.copy(email = valor) } },
            etiqueta = stringResource(R.string.feature_cuentas_campo_email),
            error = error(CampoDeRegistro.Email),
            tipo = KeyboardType.Email,
            habilitado = !estado.enviando
        )
        CampoDeTexto(
            valor = formulario.contrasena,
            onCambio = { valor -> acciones.onCambio { it.copy(contrasena = valor) } },
            etiqueta = stringResource(R.string.feature_cuentas_campo_contrasena),
            ayuda = stringResource(R.string.feature_cuentas_ayuda_contrasena),
            error = error(CampoDeRegistro.Contrasena),
            tipo = KeyboardType.Password,
            habilitado = !estado.enviando
        )
        CampoDeTexto(
            valor = formulario.nombreUsuario,
            onCambio = { valor -> acciones.onCambio { it.copy(nombreUsuario = valor) } },
            etiqueta = stringResource(R.string.feature_cuentas_campo_nombre_usuario),
            ayuda = stringResource(R.string.feature_cuentas_ayuda_nombre_usuario),
            error = error(CampoDeRegistro.NombreUsuario),
            habilitado = !estado.enviando
        )
        CampoDeFecha(
            fecha = formulario.fechaNacimiento,
            error = error(CampoDeRegistro.FechaNacimiento),
            habilitado = !estado.enviando,
            onElegir = { fecha -> acciones.onCambio { it.copy(fechaNacimiento = fecha) } }
        )
        Privacidad(
            aceptada = formulario.aceptaPrivacidad,
            error = error(CampoDeRegistro.Privacidad),
            onCambio = { valor -> acciones.onCambio { it.copy(aceptaPrivacidad = valor) } },
            onVer = acciones.onVerPrivacidad
        )
        BotonPrincipal(
            texto = stringResource(R.string.feature_cuentas_registro_enviar),
            cargando = estado.enviando,
            onClick = acciones.onEnviar
        )
        Enlace(
            stringResource(R.string.feature_cuentas_registro_ya_tenes_cuenta),
            acciones.onIngresar
        )
    }
}

@Composable
private fun Privacidad(
    aceptada: Boolean,
    error: String?,
    onCambio: (Boolean) -> Unit,
    onVer: () -> Unit
) {
    Column {
        FilaCentrada(
            modifier = Modifier.toggleable(
                value = aceptada,
                role = Role.Checkbox,
                onValueChange = onCambio
            )
        ) {
            Checkbox(checked = aceptada, onCheckedChange = null)
            Text(
                text = stringResource(R.string.feature_cuentas_registro_privacidad),
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.fillMaxWidth()
            )
        }
        error?.let {
            Text(
                it,
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.error
            )
        }
        Enlace(stringResource(R.string.feature_cuentas_registro_ver_privacidad), onVer)
    }
}

/** Fecha de nacimiento con el selector de Material 3; se muestra como dd/mm/aaaa. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CampoDeFecha(
    fecha: String?,
    error: String?,
    habilitado: Boolean,
    onElegir: (String) -> Unit
) {
    var abierto by remember { mutableStateOf(false) }
    Row(
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        CampoDeTexto(
            valor = fecha?.let(::formatoLocal).orEmpty(),
            onCambio = {},
            etiqueta = stringResource(R.string.feature_cuentas_campo_fecha_nacimiento),
            ayuda = stringResource(R.string.feature_cuentas_ayuda_fecha_nacimiento),
            error = error,
            soloLectura = true,
            modifier = Modifier.weight(1f)
        )
        BotonSecundario(
            texto = stringResource(R.string.feature_cuentas_elegir_fecha),
            onClick = { if (habilitado) abierto = true }
        )
    }
    if (abierto) {
        val estado = rememberDatePickerState(
            initialSelectedDateMillis = fecha?.let {
                LocalDate.parse(it).atStartOfDayIn(TimeZone.UTC).toEpochMilliseconds()
            }
        )
        DatePickerDialog(
            onDismissRequest = { abierto = false },
            confirmButton = {
                TextButton(onClick = {
                    estado.selectedDateMillis?.let { milis ->
                        onElegir(
                            Instant.fromEpochMilliseconds(
                                milis
                            ).toLocalDateTime(TimeZone.UTC).date.toString()
                        )
                    }
                    abierto = false
                }) { Text(stringResource(R.string.feature_cuentas_aceptar)) }
            },
            dismissButton = {
                TextButton(onClick = {
                    abierto = false
                }) { Text(stringResource(R.string.feature_cuentas_cancelar)) }
            }
        ) { DatePicker(state = estado) }
    }
}

private fun formatoLocal(iso: String): String {
    val (anio, mes, dia) = iso.split("-")
    return "$dia/$mes/$anio"
}

@Composable
private fun Listo(estado: RegistroUiState.Listo, acciones: AccionesDeRegistro) {
    Column(verticalArrangement = Arrangement.spacedBy(Spacing.md)) {
        Text(
            stringResource(R.string.feature_cuentas_registro_listo_titulo),
            style = MaterialTheme.typography.titleMedium
        )
        Text(
            stringResource(R.string.feature_cuentas_registro_listo, estado.email),
            style = MaterialTheme.typography.bodyMedium
        )
        if (estado.reenvio == EstadoDeReenvio.Enviado) {
            Aviso(TipoDeAviso.Info, stringResource(R.string.feature_cuentas_reenviado))
        }
        BotonSecundario(
            texto = stringResource(R.string.feature_cuentas_reenviar),
            onClick = acciones.onReenviar,
            cargando = estado.reenvio == EstadoDeReenvio.Enviando
        )
        BotonPrincipal(
            texto = stringResource(R.string.feature_cuentas_registro_ir_a_ingresar),
            cargando = false,
            onClick = acciones.onIngresar
        )
    }
}
