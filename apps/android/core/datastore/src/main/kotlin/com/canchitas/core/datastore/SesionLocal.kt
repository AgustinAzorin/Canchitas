package com.canchitas.core.datastore

import androidx.datastore.core.DataStore
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach

/**
 * La sesión de este dispositivo. Mantiene el token en memoria para que la red lo agregue a cada
 * pedido sin bloquear el hilo; se carga la primera vez que alguien lee la sesión.
 */
@Singleton
class SesionLocal @Inject constructor(private val dataStore: DataStore<ArchivoDeSesion>) {
    @Volatile
    var tokenEnMemoria: String? = null
        private set

    val sesion: Flow<SesionGuardada?> = dataStore.data
        .map { it.sesion }
        .onEach { tokenEnMemoria = it?.token }

    /** Lee la sesión guardada (y deja el token listo para la red). */
    suspend fun cargar(): SesionGuardada? = sesion.first()

    suspend fun guardar(sesion: SesionGuardada) {
        dataStore.updateData { ArchivoDeSesion(sesion) }
        tokenEnMemoria = sesion.token
    }

    /** RF-007: el dispositivo deja de tener la sesión y sus datos. */
    suspend fun borrar() {
        dataStore.updateData { ArchivoDeSesion() }
        tokenEnMemoria = null
    }
}
