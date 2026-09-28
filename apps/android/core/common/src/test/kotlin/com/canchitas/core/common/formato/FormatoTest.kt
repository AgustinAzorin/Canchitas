package com.canchitas.core.common.formato

import kotlin.time.Instant
import org.junit.Assert.assertEquals
import org.junit.Test

class FormatoTest {
    @Test
    fun `RNF-025 muestra la fecha en hora de Argentina`() {
        val instante = Instant.parse("2026-10-10T02:00:00Z")

        assertEquals("vie 09/10 · 23:00", Formato.fechaYHora(instante))
    }

    @Test
    fun `RNF-026 muestra pesos sin decimales`() {
        assertEquals("$ 6.000", Formato.pesos(6_000))
    }
}
