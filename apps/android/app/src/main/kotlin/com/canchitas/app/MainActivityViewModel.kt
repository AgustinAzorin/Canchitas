package com.canchitas.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.Sesion
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

sealed interface MainActivityUiState {
    data object Loading : MainActivityUiState

    data class Success(val conSesion: Boolean) : MainActivityUiState
}

/** Decide la primera pantalla: con sesión guardada (RNF-012) va al inicio; si no, al ingreso. */
@HiltViewModel
class MainActivityViewModel @Inject constructor(cuentas: CuentasRepository) : ViewModel() {
    val uiState: StateFlow<MainActivityUiState> = cuentas.sesion
        .map { MainActivityUiState.Success(conSesion = it is Sesion.Iniciada) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MainActivityUiState.Loading)
}
