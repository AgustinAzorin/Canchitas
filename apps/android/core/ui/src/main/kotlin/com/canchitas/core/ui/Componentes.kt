package com.canchitas.core.ui

import androidx.annotation.DrawableRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.error
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.canchitas.core.designsystem.icon.CanchitasIcons
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.core.designsystem.theme.Spacing

/** Pantalla simple: una columna con título que scrollea (GUIDELINES, layout). */
@Composable
fun MarcoDePantalla(
    titulo: String,
    modifier: Modifier = Modifier,
    contenido: @Composable () -> Unit
) {
    Surface(modifier = modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .verticalScroll(rememberScrollState())
                .padding(Spacing.lg),
            verticalArrangement = Arrangement.spacedBy(Spacing.lg)
        ) {
            Text(
                text = titulo,
                style = MaterialTheme.typography.headlineMedium,
                modifier = Modifier.semantics { heading() }
            )
            contenido()
        }
    }
}

/** TextField del design system: label visible, ayuda o error debajo (GUIDELINES, TextField). */
@Composable
fun CampoDeTexto(
    valor: String,
    onCambio: (String) -> Unit,
    etiqueta: String,
    modifier: Modifier = Modifier,
    ayuda: String? = null,
    error: String? = null,
    tipo: KeyboardType = KeyboardType.Text,
    habilitado: Boolean = true,
    soloLectura: Boolean = false
) {
    val esContrasena = tipo == KeyboardType.Password
    OutlinedTextField(
        value = valor,
        onValueChange = onCambio,
        modifier = modifier
            .fillMaxWidth()
            .semantics { if (error != null) error(error) },
        enabled = habilitado,
        readOnly = soloLectura,
        label = { Text(etiqueta) },
        supportingText = (error ?: ayuda)?.let { texto -> { Text(texto) } },
        isError = error != null,
        singleLine = true,
        shape = MaterialTheme.shapes.medium,
        textStyle = MaterialTheme.typography.bodyMedium,
        visualTransformation =
            if (esContrasena) PasswordVisualTransformation() else VisualTransformation.None,
        keyboardOptions = KeyboardOptions(keyboardType = tipo, autoCorrectEnabled = false)
    )
}

/** Botón primario de pie de formulario: 48 dp, ancho completo, spinner mientras envía. */
@Composable
fun BotonPrincipal(
    texto: String,
    cargando: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        enabled = !cargando,
        shape = MaterialTheme.shapes.medium,
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
    ) {
        if (cargando) {
            CircularProgressIndicator(
                modifier = Modifier
                    .padding(end = Spacing.sm)
                    .size(16.dp),
                strokeWidth = 2.dp,
                color = MaterialTheme.colorScheme.onPrimary
            )
        }
        Text(texto, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun BotonSecundario(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    cargando: Boolean = false,
    /** Dentro de un Aviso, el botón toma el color del texto del aviso. */
    colorDelContenido: Color? = null
) {
    OutlinedButton(
        onClick = onClick,
        enabled = !cargando,
        shape = MaterialTheme.shapes.medium,
        modifier = modifier.heightIn(min = 48.dp),
        colors = if (colorDelContenido == null) {
            ButtonDefaults.outlinedButtonColors()
        } else {
            ButtonDefaults.outlinedButtonColors(contentColor = colorDelContenido)
        },
        border =
            colorDelContenido?.let { BorderStroke(1.dp, it) }
                ?: ButtonDefaults.outlinedButtonBorder(!cargando)
    ) {
        if (cargando) {
            CircularProgressIndicator(
                modifier = Modifier
                    .padding(end = Spacing.sm)
                    .size(16.dp),
                strokeWidth = 2.dp
            )
        }
        Text(texto, style = MaterialTheme.typography.labelLarge)
    }
}

/** Link de navegación: texto, no botón relleno (GUIDELINES, Button). */
@Composable
fun Enlace(texto: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    TextButton(
        onClick = onClick,
        shape = MaterialTheme.shapes.medium,
        modifier = modifier.heightIn(min = 48.dp)
    ) {
        Text(texto, style = MaterialTheme.typography.labelLarge)
    }
}

enum class TipoDeAviso { Info, Exito, Advertencia, Error }

/** Alert: ícono más texto sobre el color del rol (GUIDELINES, Alert). El texto dice qué pasa. */
@Composable
fun Aviso(
    tipo: TipoDeAviso,
    texto: String,
    modifier: Modifier = Modifier,
    accion: (@Composable () -> Unit)? = null
) {
    val colores = CanchitasTheme.extendedColors
    val (fondo, frente, icono) = when (tipo) {
        TipoDeAviso.Info -> Triple(colores.info, colores.infoForeground, CanchitasIcons.Info)

        TipoDeAviso.Exito -> Triple(
            colores.success,
            colores.successForeground,
            CanchitasIcons.CheckCircle
        )

        TipoDeAviso.Advertencia -> Triple(
            colores.warning,
            colores.warningForeground,
            CanchitasIcons.Warning
        )

        TipoDeAviso.Error -> Triple(
            MaterialTheme.colorScheme.error,
            MaterialTheme.colorScheme.onError,
            CanchitasIcons.Error
        )
    }
    ContenidoDeAviso(fondo, frente, icono, texto, modifier, accion)
}

@Composable
private fun ContenidoDeAviso(
    fondo: Color,
    frente: Color,
    @DrawableRes icono: Int,
    texto: String,
    modifier: Modifier,
    accion: (@Composable () -> Unit)?
) {
    Surface(
        color = fondo,
        contentColor = frente,
        shape = MaterialTheme.shapes.medium,
        modifier = modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite }
    ) {
        Row(
            modifier = Modifier.padding(Spacing.md),
            horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
        ) {
            Icon(
                painter = painterResource(icono),
                contentDescription = null,
                modifier = Modifier
                    .padding(top = 2.dp)
                    .size(16.dp)
            )
            Column(verticalArrangement = Arrangement.spacedBy(Spacing.sm)) {
                Text(texto, style = MaterialTheme.typography.bodySmall)
                accion?.invoke()
            }
        }
    }
}

/** Fila con una casilla y su texto: la fila entera es tocable (48 dp). */
@Composable
fun FilaCentrada(modifier: Modifier = Modifier, contenido: @Composable () -> Unit) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
        verticalAlignment = Alignment.CenterVertically
    ) { contenido() }
}
