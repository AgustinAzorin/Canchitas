package com.canchitas.core.data.di

import com.canchitas.core.data.repository.CuentasRepository
import com.canchitas.core.data.repository.DatosDelUsuario
import com.canchitas.core.data.repository.DatosDelUsuarioEnRoom
import com.canchitas.core.data.repository.DefaultCuentasRepository
import com.canchitas.core.data.repository.DefaultGruposRepository
import com.canchitas.core.data.repository.DefaultSaludRepository
import com.canchitas.core.data.repository.GruposRepository
import com.canchitas.core.data.repository.SaludRepository
import com.canchitas.core.data.repository.TokenDeSesionLocal
import com.canchitas.core.network.sesion.ProveedorDeToken
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
internal abstract class DataModule {
    @Binds
    abstract fun bindsSaludRepository(repository: DefaultSaludRepository): SaludRepository

    @Binds
    abstract fun bindsCuentasRepository(repository: DefaultCuentasRepository): CuentasRepository

    @Binds
    abstract fun bindsGruposRepository(repository: DefaultGruposRepository): GruposRepository

    @Binds
    abstract fun bindsDatosDelUsuario(datos: DatosDelUsuarioEnRoom): DatosDelUsuario

    @Binds
    abstract fun bindsProveedorDeToken(proveedor: TokenDeSesionLocal): ProveedorDeToken
}
