package com.canchitas.app

import androidx.lifecycle.SavedStateHandle
import com.canchitas.core.testing.repository.TestCuentasRepository
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** RF-011 y RN-27: el link de invitación espera a que haya sesión. */
class MainActivityViewModelTest {
    private val viewModel = MainActivityViewModel(TestCuentasRepository(), SavedStateHandle())

    @Test
    fun `RF-011 - guarda el token del link con el que se abrio la app`() {
        viewModel.onLink("https://canchitas.app/i/abc")

        assertEquals("abc", viewModel.invitacionPendiente.value)
    }

    @Test
    fun `RF-011 - un link que no es de invitacion no cambia nada`() {
        viewModel.onLink("https://canchitas.app/i/abc")
        viewModel.onLink("https://canchitas.app/otra")
        viewModel.onLink(null)

        assertEquals("abc", viewModel.invitacionPendiente.value)
    }

    @Test
    fun `RN-27 - abierta la invitacion, ya no queda pendiente`() {
        viewModel.onLink("https://canchitas.app/i/abc")

        viewModel.onInvitacionAbierta()

        assertNull(viewModel.invitacionPendiente.value)
    }
}
