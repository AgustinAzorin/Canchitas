package com.canchitas.app

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.model.Sesion
import com.canchitas.feature.grupos.navigation.LinkDeInvitacion
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

/**
 * Decide la primera pantalla: con sesión guardada (RNF-012) va al inicio; si no, al ingreso.
 * Guarda el link de invitación con el que se abrió la app (RF-011) hasta que haya sesión: sin
 * sesión se inicia sesión o se registra y después se vuelve a él (RN-27).
 */
@HiltViewModel
class MainActivityViewModel @Inject constructor(
    cuentas: CuentasRepository,
    private val savedStateHandle: SavedStateHandle
) : ViewModel() {
    val uiState: StateFlow<MainActivityUiState> = cuentas.sesion
        .map { MainActivityUiState.Success(conSesion = it is Sesion.Iniciada) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MainActivityUiState.Loading)

    /** Token del link de invitación que falta abrir, o `null`. */
    val invitacionPendiente: StateFlow<String?> =
        savedStateHandle.getStateFlow(CLAVE_DE_INVITACION, null)

    /** Link con el que se abrió la app. Si no es de invitación, se ignora. */
    fun onLink(link: String?) {
        LinkDeInvitacion.token(link)?.let { savedStateHandle[CLAVE_DE_INVITACION] = it }
    }

    fun onInvitacionAbierta() {
        savedStateHandle[CLAVE_DE_INVITACION] = null
    }

    private companion object {
        const val CLAVE_DE_INVITACION = "invitacionPendiente"
    }
}
