package com.canchitas.core.network

import java.util.UUID
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

/** Los modelos generados declaran los uuid como `@Contextual UUID`. */
object UuidComoTexto : KSerializer<UUID> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("UUID", PrimitiveKind.STRING)

    override fun serialize(encoder: Encoder, value: UUID) = encoder.encodeString(value.toString())

    override fun deserialize(decoder: Decoder): UUID = UUID.fromString(decoder.decodeString())
}
