package com.canchitas.core.datastore

import android.content.Context
import com.google.crypto.tink.Aead
import com.google.crypto.tink.KeyTemplates
import com.google.crypto.tink.RegistryConfiguration
import com.google.crypto.tink.aead.AeadConfig
import com.google.crypto.tink.integration.android.AndroidKeysetManager

/** Cifra y descifra el archivo de sesión. */
interface Cifrador {
    fun cifrar(datos: ByteArray): ByteArray

    fun descifrar(datos: ByteArray): ByteArray
}

/**
 * AES-256-GCM de Tink. El keyset vive en SharedPreferences cifrado con una clave maestra del
 * Android Keystore, que no sale del dispositivo (ADR 0009).
 */
class CifradorTink(private val aead: Aead) : Cifrador {
    override fun cifrar(datos: ByteArray): ByteArray = aead.encrypt(datos, ASOCIADO)

    override fun descifrar(datos: ByteArray): ByteArray = aead.decrypt(datos, ASOCIADO)

    companion object {
        /** Ata el texto cifrado a este uso: no se puede mover a otro archivo. */
        private val ASOCIADO = "canchitas.sesion".encodeToByteArray()

        fun conAndroidKeystore(context: Context): CifradorTink {
            AeadConfig.register()
            val keyset = AndroidKeysetManager.Builder()
                .withSharedPref(context, "canchitas_sesion_keyset", "canchitas_claves")
                .withKeyTemplate(KeyTemplates.get("AES256_GCM"))
                .withMasterKeyUri("android-keystore://canchitas_sesion")
                .build()
                .keysetHandle
            return CifradorTink(keyset.getPrimitive(RegistryConfiguration.get(), Aead::class.java))
        }
    }
}
