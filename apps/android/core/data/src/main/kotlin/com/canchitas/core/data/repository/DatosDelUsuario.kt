package com.canchitas.core.data.repository

import com.canchitas.core.database.CanchitasDatabase
import javax.inject.Inject

/** Lo que el dispositivo guardó del usuario, fuera de la sesión: grupos y, más adelante, partidos. */
interface DatosDelUsuario {
    /** RF-007: al cerrar la sesión (o cuando vence) el dispositivo deja de mostrar sus datos. */
    suspend fun borrar()
}

internal class DatosDelUsuarioEnRoom @Inject constructor(private val database: CanchitasDatabase) :
    DatosDelUsuario {
    override suspend fun borrar() = database.clearAllTables()
}
