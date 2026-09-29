package com.canchitas.core.datastore

import androidx.datastore.core.DataStoreFactory
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeysetHandle
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.aead.PredefinedAeadParameters
import java.io.File
import java.nio.file.Files
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class SesionLocalTest {
    private val cifrador = CifradorTink(nuevoAead())
    private val sesion = SesionGuardada(
        token = "token-secreto-de-la-sesion",
        cuentaId = "00000000-0000-4000-8000-000000000001",
        email = "ana@mail.com",
        nombreUsuario = "ana_10",
        verificada = true
    )

    private fun nuevoAead(): Aead {
        AeadConfig.register()
        return KeysetHandle.generateNew(PredefinedAeadParameters.AES256_GCM)
            .getPrimitive(RegistryConfiguration.get(), Aead::class.java)
    }

    private fun TestScope.sesionLocal(archivo: File, conCifrador: Cifrador = cifrador) = SesionLocal(
        DataStoreFactory.create(
            serializer = SerializadorDeSesion(conCifrador),
            scope = backgroundScope,
            produceFile = { archivo }
        )
    )

    private fun archivoNuevo(): File =
        Files.createTempDirectory("sesion").toFile().resolve("sesion.cifrada")

    @Test
    fun `RNF-012 - la sesion se guarda y sobrevive a reabrir la app`() = runTest {
        val archivo = archivoNuevo()
        sesionLocal(archivo).guardar(sesion)

        val reabierta = sesionLocal(archivo)

        assertEquals(sesion, reabierta.cargar())
        assertEquals(sesion.token, reabierta.tokenEnMemoria)
    }

    @Test
    fun `ADR 0009 - el token y el mail no quedan en texto plano`() = runTest {
        val archivo = archivoNuevo()
        sesionLocal(archivo).guardar(sesion)

        val contenido = archivo.readBytes().decodeToString()

        assertFalse(contenido.contains(sesion.token))
        assertFalse(contenido.contains(sesion.email))
    }

    @Test
    fun `ADR 0009 - otra clave no puede leer la sesion y se empieza sin sesion`() = runTest {
        val archivo = archivoNuevo()
        sesionLocal(archivo).guardar(sesion)
        val serializador = SerializadorDeSesion(CifradorTink(nuevoAead()))

        val leida = runCatching { archivo.inputStream().use { serializador.readFrom(it) } }

        assertEquals(
            "androidx.datastore.core.CorruptionException",
            leida.exceptionOrNull()?.javaClass?.name
        )
    }

    @Test
    fun `RF-007 - borrar deja el dispositivo sin sesion ni token`() = runTest {
        val local = sesionLocal(archivoNuevo())
        local.guardar(sesion)

        local.borrar()

        assertNull(local.cargar())
        assertNull(local.tokenEnMemoria)
    }

    @Test
    fun `el cifrado es reversible con la misma clave`() {
        val datos = "hola".encodeToByteArray()
        assertArrayEquals(datos, cifrador.descifrar(cifrador.cifrar(datos)))
    }
}
