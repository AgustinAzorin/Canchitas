package com.canchitas.core.data.repository

import com.canchitas.core.common.network.CanchitasDispatchers
import com.canchitas.core.common.network.Dispatcher
import com.canchitas.core.model.EstadoDeLaApi
import com.canchitas.core.network.salud.SaludNetworkDataSource
import javax.inject.Inject
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn

interface SaludRepository {
    /** Estado de la API, actualizado cada tanto mientras alguien lo observa. */
    fun observarEstado(): Flow<EstadoDeLaApi>
}

/**
 * La salud no se guarda en Room: es un dato en vivo sin valor offline. El resto de los
 * repositorios lee de Room (RNF-022).
 */
internal class DefaultSaludRepository @Inject constructor(
    private val network: SaludNetworkDataSource,
    @param:Dispatcher(CanchitasDispatchers.IO) private val ioDispatcher: CoroutineDispatcher
) : SaludRepository {
    override fun observarEstado(): Flow<EstadoDeLaApi> = flow {
        while (true) {
            emit(network.consultarEstado())
            delay(INTERVALO)
        }
    }.flowOn(ioDispatcher)

    companion object {
        /** Mismo intervalo que la web (RNF-002). */
        val INTERVALO: Duration = 10.seconds
    }
}
