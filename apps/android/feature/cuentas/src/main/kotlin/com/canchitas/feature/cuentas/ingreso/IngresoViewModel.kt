package com.canchitas.feature.cuentas.ingreso

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.feature.cuentas.R
import com.canchitas.feature.cuentas.Validacion
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class CampoDeIngreso { Email, Contrasena }

sealed interface IngresoUiState {
    data class Editando(
        val email: String = "",
        val contrasena: String = "",
        val errores: Map<CampoDeIngreso, Int> = emptyMap(),
        val enviando: Boolean = false,
        /** RF-005: credenciales inválidas sin decir cuál; RNF-011: bloqueo. */
        val error: ErrorDeApi? = null
    ) : IngresoUiState

    /** La sesión quedó guardada en el dispositivo (RNF-012). */
    data object Ingresado : IngresoUiState
}

/** RF-005 y RNF-011. */
@HiltViewModel
class IngresoViewModel @Inject constructor(private val cuentas: CuentasRepository) : ViewModel() {
    private val estado = MutableStateFlow<IngresoUiState>(IngresoUiState.Editando())
    val uiState: StateFlow<IngresoUiState> = estado.asStateFlow()

    fun onEmail(email: String) = editar { it.copy(email = email) }

    fun onContrasena(contrasena: String) = editar { it.copy(contrasena = contrasena) }

    fun onEnviar() {
        val actual = estado.value as? IngresoUiState.Editando ?: return
        if (actual.enviando) return
        val errores = buildMap {
            Validacion.email(actual.email)?.let { put(CampoDeIngreso.Email, it) }
            if (actual.contrasena.isEmpty()) put(CampoDeIngreso.Contrasena, R.string.feature_cuentas_obligatorio)
        }
        if (errores.isNotEmpty()) {
            estado.value = actual.copy(errores = errores, error = null)
            return
        }
        estado.value = actual.copy(errores = emptyMap(), error = null, enviando = true)
        viewModelScope.launch {
            estado.value = when (val resultado = cuentas.iniciarSesion(actual.email.trim(), actual.contrasena)) {
                is Resultado.Exito -> IngresoUiState.Ingresado
                // La contraseña se borra después de un intento fallido.
                is Resultado.Fallo -> actual.copy(contrasena = "", enviando = false, error = resultado.error)
            }
        }
    }

    private fun editar(cambio: (IngresoUiState.Editando) -> IngresoUiState.Editando) {
        estado.update { if (it is IngresoUiState.Editando && !it.enviando) cambio(it) else it }
    }
}
