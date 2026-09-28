package com.canchitas.core.network.di

import com.canchitas.core.network.BuildConfig
import com.canchitas.core.network.generated.apis.SaludApi
import com.canchitas.core.network.salud.RetrofitSaludNetwork
import com.canchitas.core.network.salud.SaludNetworkDataSource
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun providesJson(): Json = Json { ignoreUnknownKeys = true }

    @Provides
    @Singleton
    fun providesOkHttpClient(): OkHttpClient = OkHttpClient.Builder()
        .apply {
            // Solo el método, la URL y el código: nunca cuerpos ni headers (RNF-017, ADR 0015).
            if (BuildConfig.DEBUG) {
                addInterceptor(
                    HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC)
                )
            }
        }
        .build()

    @Provides
    @Singleton
    fun providesRetrofit(json: Json, okHttpClient: OkHttpClient): Retrofit =
        crearRetrofit(BuildConfig.API_URL, json, okHttpClient)

    @Provides
    @Singleton
    fun providesSaludApi(retrofit: Retrofit): SaludApi = retrofit.create(SaludApi::class.java)

    fun crearRetrofit(baseUrl: String, json: Json, okHttpClient: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
}

@Module
@InstallIn(SingletonComponent::class)
internal abstract class NetworkBindsModule {
    @Binds
    abstract fun bindsSaludNetwork(network: RetrofitSaludNetwork): SaludNetworkDataSource
}
