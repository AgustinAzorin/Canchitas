package com.canchitas.feature.grupos.grupo

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.GruposRepository
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Resultado
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class EstadoDeRegeneracion { Inicial, Confirmando, Regenerando, Regenerado }

sealed interface GrupoUiState {
    data object Loading : GrupoUiState

    /** No hay nada guardado y la API no lo pudo traer (sin red, o no es miembro). */
    data class Error(val error: ErrorDeApi) : GrupoUiState

    data class Success(
        val grupo: Grupo,
        val regeneracion: EstadoDeRegeneracion = EstadoDeRegeneracion.Inicial,
        val error: ErrorDeApi? = null
    ) : GrupoUiState
}

private data class Acciones(
    val regeneracion: EstadoDeRegeneracion = EstadoDeRegeneracion.Inicial,
    val error: ErrorDeApi? = null
)

/** Un grupo: lo guardado en Room y lo que trae la API (RNF-022). RF-012 para los admins. */
@HiltViewModel
class GrupoViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val grupos: GruposRepository
) : ViewModel() {
    private val grupoId: String = checkNotNull(savedStateHandle["grupoId"])
    private val acciones = MutableStateFlow(Acciones())
    private val errorDeCarga = MutableStateFlow<ErrorDeApi?>(null)

    val uiState: StateFlow<GrupoUiState> =
        combine(grupos.grupo(grupoId), acciones, errorDeCarga) { grupo, acciones, error ->
            when {
                grupo != null -> GrupoUiState.Success(grupo, acciones.regeneracion, acciones.error)
                error != null -> GrupoUiState.Error(error)
                else -> GrupoUiState.Loading
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), GrupoUiState.Loading)

    init {
        viewModelScope.launch {
            errorDeCarga.value = (grupos.actualizarGrupo(grupoId) as? Resultado.Fallo)?.error
        }
    }

    fun onPedirRegeneracion() = acciones.update {
        if (it.regeneracion == EstadoDeRegeneracion.Regenerando) {
            it
        } else {
            Acciones(regeneracion = EstadoDeRegeneracion.Confirmando)
        }
    }

    fun onCancelarRegeneracion() = acciones.update { Acciones() }

    fun onConfirmarRegeneracion() {
        if (acciones.value.regeneracion != EstadoDeRegeneracion.Confirmando) return
        acciones.value = Acciones(regeneracion = EstadoDeRegeneracion.Regenerando)
        viewModelScope.launch {
            acciones.value = when (val resultado = grupos.regenerarLink(grupoId)) {
                is Resultado.Exito -> Acciones(regeneracion = EstadoDeRegeneracion.Regenerado)
                is Resultado.Fallo -> Acciones(error = resultado.error)
            }
        }
    }
}
