package com.canchitas.feature.cuentas

import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.DatosDeAlta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.Sesion
import com.canchitas.core.testing.repository.TestCuentasRepository
import com.canchitas.core.testing.util.MainDispatcherRule
import com.canchitas.feature.cuentas.cuenta.CuentaUiState
import com.canchitas.feature.cuentas.cuenta.CuentaViewModel
import com.canchitas.feature.cuentas.ingreso.CampoDeIngreso
import com.canchitas.feature.cuentas.ingreso.IngresoUiState
import com.canchitas.feature.cuentas.ingreso.IngresoViewModel
import com.canchitas.feature.cuentas.recuperacion.RecuperacionUiState
import com.canchitas.feature.cuentas.recuperacion.RecuperacionViewModel
import com.canchitas.feature.cuentas.registro.CampoDeRegistro
import com.canchitas.feature.cuentas.registro.RegistroUiState
import com.canchitas.feature.cuentas.registro.RegistroViewModel
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class CuentasViewModelsTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repositorio = TestCuentasRepository()
    private val cuenta = Cuenta("id", "ana@mail.com", "ana_10", EstadoDeCuenta.SinVerificar)

    private fun registroCompleto(viewModel: RegistroViewModel) = viewModel.onCambio {
        it.copy(
            email = " ana@mail.com ",
            contrasena = "una-contrasena",
            nombreUsuario = "ana_10",
            fechaNacimiento = "1995-05-20",
            aceptaPrivacidad = true
        )
    }

    @Test
    fun `RF-001 - el alta manda los datos y queda esperando la verificacion`() = runTest {
        val viewModel = RegistroViewModel(repositorio)
        registroCompleto(viewModel)

        viewModel.onEnviar()

        assertEquals(
            listOf(DatosDeAlta("ana@mail.com", "una-contrasena", "ana_10", "1995-05-20", true)),
            repositorio.altas
        )
        assertEquals(RegistroUiState.Listo("ana@mail.com"), viewModel.uiState.value)
    }

    @Test
    fun `RNF-018 - sin aceptar la privacidad no se envia`() = runTest {
        val viewModel = RegistroViewModel(repositorio)
        registroCompleto(viewModel)
        viewModel.onCambio { it.copy(aceptaPrivacidad = false) }

        viewModel.onEnviar()

        val estado = viewModel.uiState.value as RegistroUiState.Editando
        assertEquals(
            R.string.feature_cuentas_validacion_privacidad,
            estado.errores[CampoDeRegistro.Privacidad]
        )
        assertTrue(repositorio.altas.isEmpty())
    }

    @Test
    fun `RF-002 - la edad la decide la API y el error va en el campo de la fecha`() = runTest {
        repositorio.respuestaDeAlta = Resultado.Fallo(ErrorDeApi.Api("menor-de-edad"))
        val viewModel = RegistroViewModel(repositorio)
        registroCompleto(viewModel)

        viewModel.onEnviar()

        val estado = viewModel.uiState.value as RegistroUiState.Editando
        assertEquals(
            R.string.feature_cuentas_error_menor_de_edad,
            estado.errores[CampoDeRegistro.FechaNacimiento]
        )
    }

    @Test
    fun `RF-003 - el nombre tomado va en su campo`() = runTest {
        repositorio.respuestaDeAlta = Resultado.Fallo(ErrorDeApi.Api("nombre-de-usuario-en-uso"))
        val viewModel = RegistroViewModel(repositorio)
        registroCompleto(viewModel)

        viewModel.onEnviar()

        val estado = viewModel.uiState.value as RegistroUiState.Editando
        assertEquals(
            R.string.feature_cuentas_error_nombre_en_uso,
            estado.errores[CampoDeRegistro.NombreUsuario]
        )
    }

    @Test
    fun `RF-001 - mientras envia no se puede enviar de nuevo`() = runTest {
        repositorio.espera = CompletableDeferred()
        val viewModel = RegistroViewModel(repositorio)
        registroCompleto(viewModel)

        viewModel.onEnviar()
        viewModel.onEnviar()

        assertEquals(true, (viewModel.uiState.value as RegistroUiState.Editando).enviando)
        assertEquals(1, repositorio.altas.size)
        repositorio.espera?.complete(Unit)
    }

    @Test
    fun `RF-004 - desde el alta se puede reenviar el mail`() = runTest {
        val viewModel = RegistroViewModel(repositorio)
        registroCompleto(viewModel)
        viewModel.onEnviar()

        viewModel.onReenviar()

        assertEquals(listOf("ana@mail.com"), repositorio.reenvios)
        assertEquals(
            RegistroUiState.Listo("ana@mail.com", EstadoDeReenvio.Enviado),
            viewModel.uiState.value
        )
    }

    @Test
    fun `RF-005 - con credenciales correctas queda ingresado`() = runTest {
        repositorio.respuestaDeInicio = Resultado.Exito(cuenta)
        val viewModel = IngresoViewModel(repositorio)
        viewModel.onEmail("ana@mail.com")
        viewModel.onContrasena("una-contrasena")

        viewModel.onEnviar()

        assertEquals(IngresoUiState.Ingresado, viewModel.uiState.value)
    }

    @Test
    fun `RF-005 - credenciales invalidas muestra el error y borra la contrasena`() = runTest {
        repositorio.respuestaDeInicio = Resultado.Fallo(ErrorDeApi.Api("credenciales-invalidas"))
        val viewModel = IngresoViewModel(repositorio)
        viewModel.onEmail("ana@mail.com")
        viewModel.onContrasena("mala")

        viewModel.onEnviar()

        val estado = viewModel.uiState.value as IngresoUiState.Editando
        assertEquals(ErrorDeApi.Api("credenciales-invalidas"), estado.error)
        assertEquals("", estado.contrasena)
        assertEquals(
            R.string.feature_cuentas_error_credenciales,
            mensajeDe(requireNotNull(estado.error))
        )
    }

    @Test
    fun `RNF-011 - el bloqueo tiene su propio mensaje`() {
        assertEquals(
            R.string.feature_cuentas_error_bloqueada,
            mensajeDe(ErrorDeApi.Api("cuenta-bloqueada"))
        )
    }

    @Test
    fun `RF-005 - sin mail no se envia`() = runTest {
        val viewModel = IngresoViewModel(repositorio)

        viewModel.onEnviar()

        val estado = viewModel.uiState.value as IngresoUiState.Editando
        assertEquals(R.string.feature_cuentas_obligatorio, estado.errores[CampoDeIngreso.Email])
        assertTrue(repositorio.inicios.isEmpty())
    }

    @Test
    fun `RF-006 - pedir el enlace de recuperacion`() = runTest {
        val viewModel = RecuperacionViewModel(repositorio)
        viewModel.onEmail("ana@mail.com")

        viewModel.onEnviar()

        assertEquals(listOf("ana@mail.com"), repositorio.recuperaciones)
        assertEquals(RecuperacionUiState.Enviado, viewModel.uiState.value)
    }

    @Test
    fun `RF-004 y RF-007 - se ve la cuenta, se reenvia el mail y se cierra la sesion`() = runTest {
        repositorio.cambiarSesion(Sesion.Iniciada(cuenta))
        val viewModel = CuentaViewModel(repositorio)
        backgroundScope.launch { viewModel.uiState.collect {} }

        assertEquals(
            CuentaUiState.ConSesion(cuenta),
            viewModel.uiState.first {
                it is CuentaUiState.ConSesion
            }
        )
        viewModel.onReenviar()
        assertEquals(listOf("ana@mail.com"), repositorio.reenvios)
        assertEquals(
            EstadoDeReenvio.Enviado,
            (viewModel.uiState.value as CuentaUiState.ConSesion).reenvio
        )

        viewModel.onCerrarSesion()
        assertEquals(CuentaUiState.SinSesion, viewModel.uiState.value)
    }

    @Test
    fun `RF-007 - sin red la sesion sigue y se avisa`() = runTest {
        repositorio.cambiarSesion(Sesion.Iniciada(cuenta))
        repositorio.respuestaDeCierre = Resultado.Fallo(ErrorDeApi.SinConexion)
        val viewModel = CuentaViewModel(repositorio)
        backgroundScope.launch { viewModel.uiState.collect {} }
        viewModel.uiState.first { it is CuentaUiState.ConSesion }

        viewModel.onCerrarSesion()

        val estado = viewModel.uiState.value as CuentaUiState.ConSesion
        assertEquals(ErrorDeApi.SinConexion, estado.error)
    }
}
