package com.canchitas.core.testing.repository

import com.canchitas.core.data.repository.SaludRepository
import com.canchitas.core.model.EstadoDeLaApi
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow

/** Repositorio de salud controlado desde el test. */
class TestSaludRepository : SaludRepository {
    private val estados =
        MutableSharedFlow<EstadoDeLaApi>(replay = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    override fun observarEstado(): Flow<EstadoDeLaApi> = estados

    fun enviar(estado: EstadoDeLaApi) {
        estados.tryEmit(estado)
    }
}
