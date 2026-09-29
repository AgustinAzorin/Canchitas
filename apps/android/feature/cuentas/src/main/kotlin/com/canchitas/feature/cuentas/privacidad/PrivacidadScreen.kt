package com.canchitas.feature.cuentas.privacidad

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.canchitas.core.ui.Aviso
import com.canchitas.core.ui.Enlace
import com.canchitas.core.ui.MarcoDePantalla
import com.canchitas.core.ui.TipoDeAviso
import com.canchitas.feature.cuentas.R

/** RNF-018: la política se puede leer antes de aceptarla. Texto provisorio hasta M9. */
@Composable
fun PrivacidadScreen(onVolver: () -> Unit, modifier: Modifier = Modifier) {
    MarcoDePantalla(
        titulo = stringResource(R.string.feature_cuentas_privacidad_titulo),
        modifier = modifier
    ) {
        Aviso(
            TipoDeAviso.Advertencia,
            stringResource(R.string.feature_cuentas_privacidad_provisoria)
        )
        listOf(
            R.string.feature_cuentas_privacidad_1,
            R.string.feature_cuentas_privacidad_2,
            R.string.feature_cuentas_privacidad_3
        ).forEach { Text(stringResource(it), style = MaterialTheme.typography.bodyMedium) }
        Enlace(stringResource(R.string.feature_cuentas_volver), onVolver)
    }
}
