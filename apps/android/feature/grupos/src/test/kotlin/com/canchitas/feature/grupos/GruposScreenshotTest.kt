package com.canchitas.feature.grupos

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.core.model.AccionDeGrupo
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeInvitacion
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.model.RolEnGrupo
import com.canchitas.feature.grupos.grupo.AccionesDeGrupo
import com.canchitas.feature.grupos.grupo.EstadoDeRegeneracion
import com.canchitas.feature.grupos.grupo.GrupoScreen
import com.canchitas.feature.grupos.grupo.GrupoUiState
import com.canchitas.feature.grupos.inicio.AccionesDeMisGrupos
import com.canchitas.feature.grupos.inicio.FormularioDeGrupo
import com.canchitas.feature.grupos.inicio.MisGruposSection
import com.canchitas.feature.grupos.inicio.MisGruposUiState
import com.canchitas.feature.grupos.invitacion.AccionesDeInvitacion
import com.canchitas.feature.grupos.invitacion.EstadoDeReenvio
import com.canchitas.feature.grupos.invitacion.InvitacionScreen
import com.canchitas.feature.grupos.invitacion.InvitacionUiState
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Cada estado de las pantallas de grupos, en claro y en oscuro (RF-010, RF-011, RF-012). */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h900dp-xhdpi")
class GruposScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    private fun capturar(nombre: String, contenido: @Composable () -> Unit) {
        var oscuro by mutableStateOf(false)
        composeRule.setContent {
            CanchitasTheme(darkTheme = oscuro) {
                Surface(color = MaterialTheme.colorScheme.background) { contenido() }
            }
        }
        composeRule.onRoot().captureRoboImage("src/test/screenshots/${nombre}_claro.png")
        oscuro = true
        composeRule.waitForIdle()
        composeRule.onRoot().captureRoboImage("src/test/screenshots/${nombre}_oscuro.png")
    }

    private val deAdmin = Grupo(
        id = "g1",
        nombre = "Los del jueves",
        cantidadMiembros = 8,
        rol = RolEnGrupo.Admin,
        link = "https://canchitas.app/i/Xq3v9KpL2mNb7RtY1sWd0A",
        acciones = setOf(AccionDeGrupo.VerLink, AccionDeGrupo.RegenerarLink)
    )
    private val deJugador = deAdmin.copy(
        rol = RolEnGrupo.Jugador,
        link = null,
        acciones = emptySet()
    )
    private val invitacion = Invitacion("g1", "Los del jueves", 8, EstadoDeInvitacion.PuedeUnirse)
    private val lista = listOf(
        ResumenDeGrupo("g1", "Los del jueves", 8, RolEnGrupo.Admin),
        ResumenDeGrupo("g2", "Fútbol 11 de los domingos", 1, RolEnGrupo.Jugador)
    )

    private fun misGrupos(nombre: String, estado: MisGruposUiState) =
        capturar("mis_grupos_$nombre") { MisGruposSection(estado, AccionesDeMisGrupos()) }

    private fun grupo(nombre: String, estado: GrupoUiState) =
        capturar("grupo_$nombre") { GrupoScreen(estado, AccionesDeGrupo()) }

    private fun invitacion(nombre: String, estado: InvitacionUiState) =
        capturar("invitacion_$nombre") { InvitacionScreen(estado, AccionesDeInvitacion()) }

    @Test
    fun misGruposConsultando() = misGrupos("consultando", MisGruposUiState.Loading)

    @Test
    fun misGruposVacio() = misGrupos("vacio", MisGruposUiState.Success(emptyList()))

    @Test
    fun misGruposConGrupos() = misGrupos("con_grupos", MisGruposUiState.Success(lista))

    @Test
    fun misGruposSinConexion() = misGrupos(
        "sin_conexion",
        MisGruposUiState.Success(lista, errorDeLista = ErrorDeApi.SinConexion)
    )

    @Test
    fun misGruposNombreVacio() = misGrupos(
        "nombre_vacio",
        MisGruposUiState.Success(
            emptyList(),
            FormularioDeGrupo(errorDeCampo = R.string.feature_grupos_obligatorio)
        )
    )

    @Test
    fun misGruposCreando() = misGrupos(
        "creando",
        MisGruposUiState.Success(lista, FormularioDeGrupo("Los del jueves", creando = true))
    )

    @Test
    fun grupoConsultando() = grupo("consultando", GrupoUiState.Loading)

    @Test
    fun grupoDeAdmin() = grupo("de_admin", GrupoUiState.Success(deAdmin))

    @Test
    fun grupoConfirmandoRegeneracion() =
        grupo("confirmando", GrupoUiState.Success(deAdmin, EstadoDeRegeneracion.Confirmando))

    @Test
    fun grupoLinkRegenerado() =
        grupo("regenerado", GrupoUiState.Success(deAdmin, EstadoDeRegeneracion.Regenerado))

    @Test
    fun grupoDeJugador() = grupo("de_jugador", GrupoUiState.Success(deJugador))

    @Test
    fun grupoNoEncontrado() =
        grupo("no_encontrado", GrupoUiState.Error(ErrorDeApi.Api("grupo-no-encontrado")))

    @Test
    fun invitacionConsultando() = invitacion("consultando", InvitacionUiState.Loading)

    @Test
    fun invitacionPuedeUnirse() = invitacion("puede_unirse", InvitacionUiState.Success(invitacion))

    @Test
    fun invitacionUniendo() =
        invitacion("uniendo", InvitacionUiState.Success(invitacion, uniendo = true))

    @Test
    fun invitacionSinVerificar() = invitacion(
        "sin_verificar",
        InvitacionUiState.Success(invitacion.copy(estado = EstadoDeInvitacion.CuentaSinVerificar))
    )

    @Test
    fun invitacionSinVerificarReenviado() = invitacion(
        "sin_verificar_reenviado",
        InvitacionUiState.Success(
            invitacion.copy(estado = EstadoDeInvitacion.CuentaSinVerificar),
            reenvio = EstadoDeReenvio.Enviado
        )
    )

    @Test
    fun invitacionExpulsado() = invitacion(
        "expulsado",
        InvitacionUiState.Success(invitacion.copy(estado = EstadoDeInvitacion.Expulsado))
    )

    @Test
    fun invitacionLinkInvalido() =
        invitacion("link_invalido", InvitacionUiState.Error(ErrorDeApi.Api("link-invalido")))
}
