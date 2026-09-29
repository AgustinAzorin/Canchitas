package com.canchitas.feature.cuentas.recuperacion

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.feature.cuentas.Validacion
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface RecuperacionUiState {
    data class Editando(
        val email: String = "",
        val errorDeCampo: Int? = null,
        val enviando: Boolean = false,
        val error: ErrorDeApi? = null
    ) : RecuperacionUiState

    /** El enlace llega al mail y se abre en la web (RF-006). */
    data object Enviado : RecuperacionUiState
}

/** RF-006: pedir el enlace para definir una contraseña nueva. */
@HiltViewModel
class RecuperacionViewModel @Inject constructor(private val cuentas: CuentasRepository) :
    ViewModel() {
    private val estado = MutableStateFlow<RecuperacionUiState>(RecuperacionUiState.Editando())
    val uiState: StateFlow<RecuperacionUiState> = estado.asStateFlow()

    fun onEmail(email: String) = estado.update {
        if (it is RecuperacionUiState.Editando && !it.enviando) it.copy(email = email) else it
    }

    fun onEnviar() {
        val actual =
            (estado.value as? RecuperacionUiState.Editando)?.takeIf { !it.enviando } ?: return
        val error = Validacion.email(actual.email)
        if (error != null) {
            estado.value = actual.copy(errorDeCampo = error, error = null)
            return
        }
        estado.value = actual.copy(errorDeCampo = null, error = null, enviando = true)
        viewModelScope.launch {
            estado.value = when (val resultado = cuentas.pedirRecuperacion(actual.email.trim())) {
                is Resultado.Exito -> RecuperacionUiState.Enviado
                is Resultado.Fallo -> actual.copy(enviando = false, error = resultado.error)
            }
        }
    }
}
