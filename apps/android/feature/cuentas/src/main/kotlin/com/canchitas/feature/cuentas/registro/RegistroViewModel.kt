package com.canchitas.feature.cuentas.registro

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.feature.cuentas.EstadoDeReenvio
import com.canchitas.feature.cuentas.R
import com.canchitas.feature.cuentas.Validacion
import com.canchitas.feature.cuentas.mensajeDe
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class CampoDeRegistro { Email, Contrasena, NombreUsuario, FechaNacimiento, Privacidad }

data class FormularioDeRegistro(
    val email: String = "",
    val contrasena: String = "",
    val nombreUsuario: String = "",
    /** AAAA-MM-DD, o null si todavía no se eligió. */
    val fechaNacimiento: String? = null,
    val aceptaPrivacidad: Boolean = false
)

sealed interface RegistroUiState {
    /** Completando el formulario. `errores` tiene un texto por campo; `error` va arriba. */
    data class Editando(
        val formulario: FormularioDeRegistro = FormularioDeRegistro(),
        val errores: Map<CampoDeRegistro, Int> = emptyMap(),
        val enviando: Boolean = false,
        val error: ErrorDeApi? = null
    ) : RegistroUiState

    /** RF-001: cuenta creada sin verificar; se mandó el mail (RF-004). */
    data class Listo(val email: String, val reenvio: EstadoDeReenvio = EstadoDeReenvio.Inicial) :
        RegistroUiState
}

/** RF-001, RF-002, RF-003 y RNF-018. */
@HiltViewModel
class RegistroViewModel @Inject constructor(private val cuentas: CuentasRepository) : ViewModel() {
    private val estado = MutableStateFlow<RegistroUiState>(RegistroUiState.Editando())
    val uiState: StateFlow<RegistroUiState> = estado.asStateFlow()

    fun onCambio(cambio: (FormularioDeRegistro) -> FormularioDeRegistro) = editar {
        it.copy(formulario = cambio(it.formulario))
    }

    fun onEnviar() {
        val actual = (estado.value as? RegistroUiState.Editando)?.takeIf { !it.enviando } ?: return
        val errores = validar(actual.formulario)
        val fecha = actual.formulario.fechaNacimiento
        if (errores.isNotEmpty() || fecha == null) {
            estado.value = actual.copy(errores = errores, error = null)
            return
        }
        estado.value = actual.copy(errores = emptyMap(), error = null, enviando = true)
        viewModelScope.launch {
            val formulario = actual.formulario
            val datos = DatosDeAlta(
                email = formulario.email.trim(),
                contrasena = formulario.contrasena,
                nombreUsuario = formulario.nombreUsuario.trim(),
                fechaNacimiento = fecha,
                aceptaPrivacidad = formulario.aceptaPrivacidad
            )
            estado.value = when (val resultado = cuentas.registrar(datos)) {
                is Resultado.Exito -> RegistroUiState.Listo(resultado.valor)
                is Resultado.Fallo -> conErrorDeApi(actual, resultado.error)
            }
        }
    }

    fun onReenviar() {
        val listo = estado.value as? RegistroUiState.Listo ?: return
        estado.value = listo.copy(reenvio = EstadoDeReenvio.Enviando)
        viewModelScope.launch {
            val resultado = cuentas.reenviarVerificacion(listo.email)
            estado.value = listo.copy(
                reenvio = if (resultado is Resultado.Exito) {
                    EstadoDeReenvio.Enviado
                } else {
                    EstadoDeReenvio.Inicial
                }
            )
        }
    }

    private fun editar(cambio: (RegistroUiState.Editando) -> RegistroUiState.Editando) {
        estado.update { if (it is RegistroUiState.Editando && !it.enviando) cambio(it) else it }
    }

    private fun validar(formulario: FormularioDeRegistro): Map<CampoDeRegistro, Int> = buildMap {
        Validacion.email(formulario.email)?.let { put(CampoDeRegistro.Email, it) }
        Validacion.contrasenaNueva(formulario.contrasena)?.let {
            put(CampoDeRegistro.Contrasena, it)
        }
        Validacion.nombreDeUsuario(formulario.nombreUsuario)?.let {
            put(CampoDeRegistro.NombreUsuario, it)
        }
        if (formulario.fechaNacimiento ==
            null
        ) {
            put(CampoDeRegistro.FechaNacimiento, R.string.feature_cuentas_obligatorio)
        }
        if (!formulario.aceptaPrivacidad) {
            put(
                CampoDeRegistro.Privacidad,
                R.string.feature_cuentas_validacion_privacidad
            )
        }
    }

    /** Los errores que corresponden a un campo se muestran en el campo; el resto, arriba. */
    private fun conErrorDeApi(
        actual: RegistroUiState.Editando,
        error: ErrorDeApi
    ): RegistroUiState.Editando {
        val campo = (error as? ErrorDeApi.Api)?.codigo?.let(CAMPO_DEL_ERROR::get)
        return if (campo == null) {
            actual.copy(enviando = false, error = error)
        } else {
            actual.copy(enviando = false, errores = mapOf(campo to mensajeDe(error)))
        }
    }

    private companion object {
        val CAMPO_DEL_ERROR = mapOf(
            "email-en-uso" to CampoDeRegistro.Email,
            "nombre-de-usuario-en-uso" to CampoDeRegistro.NombreUsuario,
            "nombre-de-usuario-invalido" to CampoDeRegistro.NombreUsuario,
            "menor-de-edad" to CampoDeRegistro.FechaNacimiento,
            "fecha-invalida" to CampoDeRegistro.FechaNacimiento,
            "privacidad-no-aceptada" to CampoDeRegistro.Privacidad
        )
    }
}
