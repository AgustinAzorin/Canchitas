package com.canchitas.core.datastore

import androidx.datastore.core.CorruptionException
import androidx.datastore.core.Serializer
import java.io.InputStream
import java.io.OutputStream
import java.security.GeneralSecurityException
import kotlinx.serialization.SerializationException
import kotlinx.serialization.json.Json

/** DataStore guarda la sesión como JSON cifrado: el token nunca queda en texto plano. */
class SerializadorDeSesion(private val cifrador: Cifrador) : Serializer<ArchivoDeSesion> {
    private val json = Json { ignoreUnknownKeys = true }

    override val defaultValue: ArchivoDeSesion = ArchivoDeSesion()

    override suspend fun readFrom(input: InputStream): ArchivoDeSesion {
        val cifrado = input.readBytes()
        if (cifrado.isEmpty()) return defaultValue
        return try {
            json.decodeFromString(cifrado.let(cifrador::descifrar).decodeToString())
        } catch (e: GeneralSecurityException) {
            throw CorruptionException("No se pudo descifrar la sesión", e)
        } catch (e: SerializationException) {
            throw CorruptionException("La sesión guardada no tiene el formato esperado", e)
        }
    }

    override suspend fun writeTo(t: ArchivoDeSesion, output: OutputStream) {
        output.write(cifrador.cifrar(json.encodeToString(ArchivoDeSesion.serializer(), t).encodeToByteArray()))
    }
}
