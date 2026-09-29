package com.canchitas.feature.grupos.invitacion

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.data.repository.GruposRepository
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeInvitacion
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.Sesion
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class EstadoDeReenvio { Inicial, Enviando, Enviado }

sealed interface InvitacionUiState {
    data object Loading : InvitacionUiState

    /** El link no sirve (RF-011) o no hubo respuesta. */
    data class Error(val error: ErrorDeApi) : InvitacionUiState

    data class Success(
        val invitacion: Invitacion,
        val uniendo: Boolean = false,
        val error: ErrorDeApi? = null,
        val reenvio: EstadoDeReenvio = EstadoDeReenvio.Inicial
    ) : InvitacionUiState

    /** Ya es miembro: la pantalla lleva al grupo (RF-011). */
    data class EnElGrupo(val grupoId: String) : InvitacionUiState
}

/** RF-011, RF-004, RN-27 y RN-28. Qué se puede hacer lo dice la API en `estado`. */
@HiltViewModel
class InvitacionViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val grupos: GruposRepository,
    private val cuentas: CuentasRepository
) : ViewModel() {
    private val token: String = checkNotNull(savedStateHandle["token"])
    private val estado = MutableStateFlow<InvitacionUiState>(InvitacionUiState.Loading)
    val uiState: StateFlow<InvitacionUiState> = estado.asStateFlow()

    init {
        cargar()
    }

    private fun cargar() {
        estado.value = InvitacionUiState.Loading
        viewModelScope.launch {
            estado.value = when (val resultado = grupos.invitacion(token)) {
                is Resultado.Exito ->
                    if (resultado.valor.estado == EstadoDeInvitacion.YaEsMiembro) {
                        // Sin duplicar la membresía: se guarda el grupo y se va a él.
                        grupos.actualizarGrupo(resultado.valor.grupoId)
                        InvitacionUiState.EnElGrupo(resultado.valor.grupoId)
                    } else {
                        InvitacionUiState.Success(resultado.valor)
                    }

                is Resultado.Fallo -> InvitacionUiState.Error(resultado.error)
            }
        }
    }

    fun onUnirme() {
        val actual = (estado.value as? InvitacionUiState.Success)?.takeIf { !it.uniendo } ?: return
        estado.value = actual.copy(uniendo = true, error = null)
        viewModelScope.launch {
            estado.value = when (val resultado = grupos.unirse(token)) {
                is Resultado.Exito -> InvitacionUiState.EnElGrupo(resultado.valor.grupoId)
                is Resultado.Fallo -> actual.copy(uniendo = false, error = resultado.error)
            }
        }
    }

    /** RF-004: ofrece reenviar el mail de verificación. */
    fun onReenviar() {
        val actual = (estado.value as? InvitacionUiState.Success)
            ?.takeIf { it.reenvio == EstadoDeReenvio.Inicial } ?: return
        estado.value = actual.copy(reenvio = EstadoDeReenvio.Enviando, error = null)
        viewModelScope.launch {
            val cuenta = (cuentas.sesion.first() as? Sesion.Iniciada)?.cuenta
            val resultado = cuenta?.let { cuentas.reenviarVerificacion(it.email) }
                ?: Resultado.Fallo(ErrorDeApi.Api("sin-sesion"))
            estado.update { anterior ->
                val lista = anterior as? InvitacionUiState.Success ?: return@update anterior
                when (resultado) {
                    is Resultado.Exito -> lista.copy(reenvio = EstadoDeReenvio.Enviado)

                    is Resultado.Fallo ->
                        lista.copy(reenvio = EstadoDeReenvio.Inicial, error = resultado.error)
                }
            }
        }
    }

    /** Después de verificar el mail, la API vuelve a decidir si puede unirse. */
    fun onReintentar() {
        viewModelScope.launch {
            cuentas.actualizarCuenta()
            cargar()
        }
    }
}
