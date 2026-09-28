package com.canchitas.feature.salud

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.common.formato.Formato
import com.canchitas.core.data.repository.SaludRepository
import com.canchitas.core.model.EstadoDeLaApi
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

@HiltViewModel
class SaludViewModel @Inject constructor(saludRepository: SaludRepository) : ViewModel() {
    val uiState: StateFlow<SaludUiState> = saludRepository.observarEstado()
        .map(::aUiState)
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = SaludUiState.Loading
        )
}

sealed interface SaludUiState {
    data object Loading : SaludUiState

    data class Success(val version: String, val horaDelServidor: String) : SaludUiState

    data class Error(val motivo: Motivo) : SaludUiState

    enum class Motivo { BaseCaida, SinConexion }
}

private fun aUiState(estado: EstadoDeLaApi): SaludUiState = when (estado) {
    is EstadoDeLaApi.EnLinea -> SaludUiState.Success(
        estado.version,
        Formato.fechaYHora(estado.instante)
    )

    EstadoDeLaApi.BaseCaida -> SaludUiState.Error(SaludUiState.Motivo.BaseCaida)

    EstadoDeLaApi.SinConexion -> SaludUiState.Error(SaludUiState.Motivo.SinConexion)
}
