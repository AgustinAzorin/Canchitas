package com.canchitas.feature.grupos

import androidx.lifecycle.SavedStateHandle
import com.canchitas.core.model.AccionDeGrupo
import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.core.model.EstadoDeInvitacion
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.model.RolEnGrupo
import com.canchitas.core.model.Sesion
import com.canchitas.core.model.Union
import com.canchitas.core.testing.repository.TestCuentasRepository
import com.canchitas.core.testing.repository.TestGruposRepository
import com.canchitas.core.testing.util.MainDispatcherRule
import com.canchitas.feature.grupos.grupo.EstadoDeRegeneracion
import com.canchitas.feature.grupos.grupo.GrupoUiState
import com.canchitas.feature.grupos.grupo.GrupoViewModel
import com.canchitas.feature.grupos.inicio.MisGruposUiState
import com.canchitas.feature.grupos.inicio.MisGruposViewModel
import com.canchitas.feature.grupos.invitacion.EstadoDeReenvio
import com.canchitas.feature.grupos.invitacion.InvitacionUiState
import com.canchitas.feature.grupos.invitacion.InvitacionViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test

class GruposViewModelsTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val grupos = TestGruposRepository()
    private val cuentas = TestCuentasRepository()

    private val deAdmin = Grupo(
        id = "g1",
        nombre = "Los del jueves",
        cantidadMiembros = 1,
        rol = RolEnGrupo.Admin,
        link = "https://canchitas.app/i/abc",
        acciones = setOf(AccionDeGrupo.VerLink, AccionDeGrupo.RegenerarLink)
    )
    private val invitacion = Invitacion("g1", "Los del jueves", 8, EstadoDeInvitacion.PuedeUnirse)

    /** Mantiene suscripto el StateFlow, como la pantalla (Main es el dispatcher de test). */
    private fun <T> TestScope.observar(estado: StateFlow<T>) {
        backgroundScope.launch(Dispatchers.Main) { estado.collect {} }
    }

    private fun grupoViewModel() =
        GrupoViewModel(SavedStateHandle(mapOf("grupoId" to "g1")), grupos)

    private fun invitacionViewModel() =
        InvitacionViewModel(SavedStateHandle(mapOf("token" to "abc")), grupos, cuentas)

    @Test
    fun `RF-010 - crear un grupo lleva al grupo creado`() = runTest {
        grupos.respuestaDeCreacion = Resultado.Exito(deAdmin)
        val viewModel = MisGruposViewModel(grupos)
        observar(viewModel.uiState)

        viewModel.onNombre("  Los del jueves ")
        viewModel.onCrear()

        assertEquals(listOf("Los del jueves"), grupos.creados)
        val estado = viewModel.uiState.value as MisGruposUiState.Success
        assertEquals("g1", estado.formulario.creado)
        viewModel.onNavegado()
        assertEquals(null, (viewModel.uiState.value as MisGruposUiState.Success).formulario.creado)
    }

    @Test
    fun `RF-010 - sin nombre no se envia y el error de la API se muestra`() = runTest {
        grupos.respuestaDeCreacion = Resultado.Fallo(ErrorDeApi.Api("cuenta-sin-verificar"))
        val viewModel = MisGruposViewModel(grupos)
        observar(viewModel.uiState)

        viewModel.onCrear()
        assertEquals(
            R.string.feature_grupos_obligatorio,
            (viewModel.uiState.value as MisGruposUiState.Success).formulario.errorDeCampo
        )
        assertEquals(emptyList<String>(), grupos.creados)

        viewModel.onNombre("Los del jueves")
        viewModel.onCrear()
        assertEquals(
            ErrorDeApi.Api("cuenta-sin-verificar"),
            (viewModel.uiState.value as MisGruposUiState.Success).formulario.error
        )
    }

    @Test
    fun `RNF-022 - sin red se muestran los grupos guardados con el aviso`() = runTest {
        val guardado = ResumenDeGrupo("g1", "Los del jueves", 8, RolEnGrupo.Jugador)
        grupos.cambiarMisGrupos(listOf(guardado))
        grupos.respuestaDeLista = Resultado.Fallo(ErrorDeApi.SinConexion)
        val viewModel = MisGruposViewModel(grupos)
        observar(viewModel.uiState)

        assertEquals(
            MisGruposUiState.Success(listOf(guardado), errorDeLista = ErrorDeApi.SinConexion),
            viewModel.uiState.value
        )
    }

    @Test
    fun `RF-012 - el admin confirma y el link se regenera`() = runTest {
        grupos.guardar(deAdmin)
        val nuevo = deAdmin.copy(link = "https://canchitas.app/i/nuevo")
        grupos.respuestaDeRegeneracion = Resultado.Exito(nuevo)
        val viewModel = grupoViewModel()
        observar(viewModel.uiState)

        viewModel.onConfirmarRegeneracion()
        assertEquals(emptyList<String>(), grupos.regenerados)

        viewModel.onPedirRegeneracion()
        assertEquals(
            EstadoDeRegeneracion.Confirmando,
            (viewModel.uiState.value as GrupoUiState.Success).regeneracion
        )
        viewModel.onConfirmarRegeneracion()

        assertEquals(listOf("g1"), grupos.regenerados)
        assertEquals(
            GrupoUiState.Success(nuevo, EstadoDeRegeneracion.Regenerado),
            viewModel.uiState.value
        )
    }

    @Test
    fun `RF-012 - cancelar no regenera`() = runTest {
        grupos.guardar(deAdmin)
        val viewModel = grupoViewModel()
        observar(viewModel.uiState)

        viewModel.onPedirRegeneracion()
        viewModel.onCancelarRegeneracion()

        assertEquals(GrupoUiState.Success(deAdmin), viewModel.uiState.value)
        assertEquals(emptyList<String>(), grupos.regenerados)
    }

    @Test
    fun `RNF-013 - si la API rechaza la regeneracion se muestra el motivo`() = runTest {
        grupos.guardar(deAdmin)
        grupos.respuestaDeRegeneracion = Resultado.Fallo(ErrorDeApi.Api("requiere-admin"))
        val viewModel = grupoViewModel()
        observar(viewModel.uiState)

        viewModel.onPedirRegeneracion()
        viewModel.onConfirmarRegeneracion()

        assertEquals(
            GrupoUiState.Success(deAdmin, error = ErrorDeApi.Api("requiere-admin")),
            viewModel.uiState.value
        )
    }

    @Test
    fun `RNF-013 - sin nada guardado y sin acceso, la pantalla muestra el error`() = runTest {
        grupos.respuestaDeGrupo = Resultado.Fallo(ErrorDeApi.Api("grupo-no-encontrado"))
        val viewModel = grupoViewModel()
        observar(viewModel.uiState)

        assertEquals(
            GrupoUiState.Error(ErrorDeApi.Api("grupo-no-encontrado")),
            viewModel.uiState.value
        )
    }

    @Test
    fun `RF-011 - con el link vigente se une y va al grupo`() = runTest {
        grupos.respuestaDeInvitacion = Resultado.Exito(invitacion)
        grupos.respuestaDeUnion = Resultado.Exito(Union("g1", yaEraMiembro = false))
        val viewModel = invitacionViewModel()

        assertEquals(InvitacionUiState.Success(invitacion), viewModel.uiState.value)
        viewModel.onUnirme()

        assertEquals(listOf("abc"), grupos.uniones)
        assertEquals(InvitacionUiState.EnElGrupo("g1"), viewModel.uiState.value)
    }

    @Test
    fun `RF-011 - el que ya es miembro va al grupo sin unirse de nuevo`() = runTest {
        grupos.respuestaDeInvitacion =
            Resultado.Exito(invitacion.copy(estado = EstadoDeInvitacion.YaEsMiembro))
        val viewModel = invitacionViewModel()

        assertEquals(InvitacionUiState.EnElGrupo("g1"), viewModel.uiState.value)
        assertEquals(emptyList<String>(), grupos.uniones)
    }

    @Test
    fun `RF-011 - el link regenerado informa que ya no es valido`() = runTest {
        grupos.respuestaDeInvitacion = Resultado.Fallo(ErrorDeApi.Api("link-invalido"))

        assertEquals(
            InvitacionUiState.Error(ErrorDeApi.Api("link-invalido")),
            invitacionViewModel().uiState.value
        )
    }

    @Test
    fun `RF-004 - sin verificar ofrece reenviar el mail y reintentar`() = runTest {
        val cuenta = Cuenta("id", "ana@mail.com", "ana_10", EstadoDeCuenta.SinVerificar)
        cuentas.cambiarSesion(Sesion.Iniciada(cuenta))
        grupos.respuestaDeInvitacion =
            Resultado.Exito(invitacion.copy(estado = EstadoDeInvitacion.CuentaSinVerificar))
        val viewModel = invitacionViewModel()

        viewModel.onReenviar()
        assertEquals(listOf("ana@mail.com"), cuentas.reenvios)
        assertEquals(
            EstadoDeReenvio.Enviado,
            (viewModel.uiState.value as InvitacionUiState.Success).reenvio
        )

        grupos.respuestaDeInvitacion = Resultado.Exito(invitacion)
        viewModel.onReintentar()
        assertEquals(InvitacionUiState.Success(invitacion), viewModel.uiState.value)
    }

    @Test
    fun `RN-28 - el expulsado ve el motivo y la API rechaza si intenta unirse`() = runTest {
        grupos.respuestaDeInvitacion =
            Resultado.Exito(invitacion.copy(estado = EstadoDeInvitacion.Expulsado))
        grupos.respuestaDeUnion = Resultado.Fallo(ErrorDeApi.Api("expulsado-del-grupo"))
        val viewModel = invitacionViewModel()

        viewModel.onUnirme()

        val estado = viewModel.uiState.value as InvitacionUiState.Success
        assertEquals(EstadoDeInvitacion.Expulsado, estado.invitacion.estado)
        assertEquals(ErrorDeApi.Api("expulsado-del-grupo"), estado.error)
    }
}
