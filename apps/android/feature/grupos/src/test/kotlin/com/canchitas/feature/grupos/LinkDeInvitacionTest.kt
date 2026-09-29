package com.canchitas.feature.grupos

import com.canchitas.feature.grupos.navigation.LinkDeInvitacion
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LinkDeInvitacionTest {
    @Test
    fun `RF-011 - lee el token del link de invitacion`() {
        assertEquals(
            "Xq3v9KpL2mNb7RtY1sWd0A",
            LinkDeInvitacion.token("https://canchitas.app/i/Xq3v9KpL2mNb7RtY1sWd0A")
        )
        assertEquals("abc_-1", LinkDeInvitacion.token("https://staging.canchitas.app/i/abc_-1/"))
    }

    @Test
    fun `RF-011 - un link que no es de invitacion no tiene token`() {
        assertNull(LinkDeInvitacion.token(null))
        assertNull(LinkDeInvitacion.token("https://canchitas.app/"))
        assertNull(LinkDeInvitacion.token("https://canchitas.app/i/"))
        assertNull(LinkDeInvitacion.token("https://canchitas.app/i/abc/otra"))
        assertNull(LinkDeInvitacion.token("https://canchitas.app/grupos/abc"))
        assertNull(LinkDeInvitacion.token("https://canchitas.app/i/con%20espacio"))
        assertNull(LinkDeInvitacion.token("no es un link"))
    }
}
