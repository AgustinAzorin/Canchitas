package com.canchitas.core.data.di

import com.canchitas.core.data.repository.DefaultSaludRepository
import com.canchitas.core.data.repository.SaludRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
internal abstract class DataModule {
    @Binds
    abstract fun bindsSaludRepository(repository: DefaultSaludRepository): SaludRepository
}
