package com.canchitas.core.database

import androidx.room3.Database
import androidx.room3.RoomDatabase
import com.canchitas.core.database.dao.GrupoDao
import com.canchitas.core.database.model.DetalleDeGrupoEntity
import com.canchitas.core.database.model.GrupoEntity

@Database(entities = [GrupoEntity::class, DetalleDeGrupoEntity::class], version = 1)
abstract class CanchitasDatabase : RoomDatabase() {
    abstract fun grupoDao(): GrupoDao
}
