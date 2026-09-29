package com.canchitas.feature.grupos.inicio

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.GruposRepository
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.feature.grupos.validarNombreDeGrupo
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Formulario para crear un grupo (RF-010). */
data class FormularioDeGrupo(
    val nombre: String = "",
    val errorDeCampo: Int? = null,
    val creando: Boolean = false,
    val error: ErrorDeApi? = null,
    /** Id del grupo recién creado: la pantalla navega a él y avisa con `onNavegado`. */
    val creado: String? = null
)

sealed interface MisGruposUiState {
    data object Loading : MisGruposUiState

    data class Success(
        val grupos: List<ResumenDeGrupo>,
        val formulario: FormularioDeGrupo = FormularioDeGrupo(),
        /** No se pudo actualizar la lista; se muestran los grupos guardados (RNF-022). */
        val errorDeLista: ErrorDeApi? = null
    ) : MisGruposUiState
}

/** "Tus grupos" en el inicio: la lista guardada, actualizada desde la API, y crear un grupo. */
@HiltViewModel
class MisGruposViewModel @Inject constructor(private val grupos: GruposRepository) : ViewModel() {
    private val formulario = MutableStateFlow(FormularioDeGrupo())
    private val errorDeLista = MutableStateFlow<ErrorDeApi?>(null)
    private val cargada = MutableStateFlow(false)

    val uiState: StateFlow<MisGruposUiState> =
        combine(grupos.misGrupos, formulario, errorDeLista, cargada) { lista, form, error, listo ->
            if (lista.isEmpty() && !listo) {
                MisGruposUiState.Loading
            } else {
                MisGruposUiState.Success(lista, form, error)
            }
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MisGruposUiState.Loading)

    init {
        actualizar()
    }

    fun actualizar() {
        viewModelScope.launch {
            val resultado = grupos.actualizarMisGrupos()
            errorDeLista.value = (resultado as? Resultado.Fallo)?.error
            cargada.value = true
        }
    }

    fun onNombre(nombre: String) = formulario.update {
        if (it.creando) it else it.copy(nombre = nombre, errorDeCampo = null)
    }

    fun onCrear() {
        val actual = formulario.value.takeIf { !it.creando } ?: return
        val errorDeCampo = validarNombreDeGrupo(actual.nombre)
        if (errorDeCampo != null) {
            formulario.value = actual.copy(errorDeCampo = errorDeCampo, error = null)
            return
        }
        formulario.value = actual.copy(errorDeCampo = null, error = null, creando = true)
        viewModelScope.launch {
            formulario.value = when (val resultado = grupos.crearGrupo(actual.nombre.trim())) {
                is Resultado.Exito -> FormularioDeGrupo(creado = resultado.valor.id)
                is Resultado.Fallo -> actual.copy(creando = false, error = resultado.error)
            }
        }
    }

    fun onNavegado() = formulario.update { it.copy(creado = null) }
}
