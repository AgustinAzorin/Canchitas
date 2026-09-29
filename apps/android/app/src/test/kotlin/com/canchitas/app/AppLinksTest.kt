package com.canchitas.app

import android.content.Intent
import android.net.Uri
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * RF-011: el link de invitación abre la app (App Links). El dominio sale de la propiedad
 * canchitas.dominioDeLinks; por defecto, canchitas.app. La verificación real contra el
 * assetlinks.json del dominio se prueba en staging.
 */
@RunWith(RobolectricTestRunner::class)
class AppLinksTest {
    private val contexto = ApplicationProvider.getApplicationContext<CanchitasApplication>()

    private fun actividadesPara(link: String) = contexto.packageManager
        .queryIntentActivities(
            Intent(Intent.ACTION_VIEW, Uri.parse(link)).addCategory(Intent.CATEGORY_BROWSABLE),
            0
        )
        .map { it.activityInfo.name }

    @Test
    fun `RF-011 - el link de invitacion abre MainActivity`() {
        assertEquals(
            listOf(MainActivity::class.java.name),
            actividadesPara("https://canchitas.app/i/Xq3v9KpL2mNb7RtY1sWd0A")
        )
    }

    @Test
    fun `RF-011 - otras rutas, otros dominios y http no abren la app`() {
        assertTrue(actividadesPara("https://canchitas.app/grupos/abc").isEmpty())
        assertTrue(actividadesPara("https://otro.com/i/abc").isEmpty())
        assertTrue(actividadesPara("http://canchitas.app/i/abc").isEmpty())
    }
}
