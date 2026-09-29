package com.canchitas.core.database.di

import android.content.Context
import androidx.room3.Room
import com.canchitas.core.database.CanchitasDatabase
import com.canchitas.core.database.dao.GrupoDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun providesDatabase(@ApplicationContext context: Context): CanchitasDatabase =
        Room.databaseBuilder<CanchitasDatabase>(context, "canchitas.db").build()

    @Provides
    fun providesGrupoDao(database: CanchitasDatabase): GrupoDao = database.grupoDao()
}
