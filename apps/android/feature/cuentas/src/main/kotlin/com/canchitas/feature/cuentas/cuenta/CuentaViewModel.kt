package com.canchitas.feature.cuentas.cuenta

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.Sesion
import com.canchitas.feature.cuentas.EstadoDeReenvio
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

sealed interface CuentaUiState {
    data object Loading : CuentaUiState

    data object SinSesion : CuentaUiState

    data class ConSesion(
        val cuenta: Cuenta,
        val cerrando: Boolean = false,
        val reenvio: EstadoDeReenvio = EstadoDeReenvio.Inicial,
        val error: ErrorDeApi? = null
    ) : CuentaUiState
}

private data class Acciones(
    val cerrando: Boolean = false,
    val reenvio: EstadoDeReenvio = EstadoDeReenvio.Inicial,
    val error: ErrorDeApi? = null
)

/** Cuenta de la sesión en el inicio: RF-004 (sin verificar), RF-007 (cerrar sesión), RNF-012. */
@HiltViewModel
class CuentaViewModel @Inject constructor(private val cuentas: CuentasRepository) : ViewModel() {
    private val acciones = MutableStateFlow(Acciones())

    val uiState: StateFlow<CuentaUiState> = combine(cuentas.sesion, acciones) { sesion, acciones ->
        when (sesion) {
            Sesion.SinSesion -> CuentaUiState.SinSesion
            is Sesion.Iniciada -> CuentaUiState.ConSesion(
                cuenta = sesion.cuenta,
                cerrando = acciones.cerrando,
                reenvio = acciones.reenvio,
                error = acciones.error
            )
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CuentaUiState.Loading)

    init {
        // Usar la sesión corre su vencimiento en la API y trae si ya se verificó el mail.
        viewModelScope.launch { cuentas.actualizarCuenta() }
    }

    fun onCerrarSesion() {
        if (acciones.value.cerrando) return
        acciones.update { it.copy(cerrando = true, error = null) }
        viewModelScope.launch {
            val resultado = cuentas.cerrarSesion()
            acciones.update {
                it.copy(cerrando = false, error = (resultado as? Resultado.Fallo)?.error)
            }
        }
    }

    fun onReenviar() {
        val estado = uiState.value as? CuentaUiState.ConSesion ?: return
        acciones.update { it.copy(reenvio = EstadoDeReenvio.Enviando, error = null) }
        viewModelScope.launch {
            val resultado = cuentas.reenviarVerificacion(estado.cuenta.email)
            acciones.update {
                when (resultado) {
                    is Resultado.Exito -> it.copy(reenvio = EstadoDeReenvio.Enviado)
                    is Resultado.Fallo -> it.copy(reenvio = EstadoDeReenvio.Inicial, error = resultado.error)
                }
            }
        }
    }
}
