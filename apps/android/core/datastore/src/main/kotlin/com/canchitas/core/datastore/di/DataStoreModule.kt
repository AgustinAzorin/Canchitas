package com.canchitas.core.datastore.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.core.DataStoreFactory
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.dataStoreFile
import com.canchitas.core.common.network.CanchitasDispatchers
import com.canchitas.core.common.network.Dispatcher
import com.canchitas.core.datastore.ArchivoDeSesion
import com.canchitas.core.datastore.CifradorTink
import com.canchitas.core.datastore.SerializadorDeSesion
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob

@Module
@InstallIn(SingletonComponent::class)
object DataStoreModule {
    @Provides
    @Singleton
    fun providesSesionDataStore(
        @ApplicationContext context: Context,
        @Dispatcher(CanchitasDispatchers.IO) ioDispatcher: CoroutineDispatcher
    ): DataStore<ArchivoDeSesion> = DataStoreFactory.create(
        serializer = SerializadorDeSesion(CifradorTink.conAndroidKeystore(context)),
        // Si el archivo no se puede descifrar (por ejemplo, se perdió la clave), se empieza sin
        // sesión: la persona vuelve a ingresar.
        corruptionHandler = ReplaceFileCorruptionHandler { ArchivoDeSesion() },
        scope = CoroutineScope(ioDispatcher + SupervisorJob()),
        produceFile = { context.dataStoreFile("sesion.cifrada") }
    )
}
