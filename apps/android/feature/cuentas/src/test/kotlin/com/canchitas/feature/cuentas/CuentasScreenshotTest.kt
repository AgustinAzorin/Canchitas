package com.canchitas.feature.cuentas

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onRoot
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.core.model.Cuenta
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeCuenta
import com.canchitas.feature.cuentas.cuenta.CuentaSection
import com.canchitas.feature.cuentas.cuenta.CuentaUiState
import com.canchitas.feature.cuentas.ingreso.AccionesDeIngreso
import com.canchitas.feature.cuentas.ingreso.CampoDeIngreso
import com.canchitas.feature.cuentas.ingreso.IngresoScreen
import com.canchitas.feature.cuentas.ingreso.IngresoUiState
import com.canchitas.feature.cuentas.privacidad.PrivacidadScreen
import com.canchitas.feature.cuentas.recuperacion.RecuperacionScreen
import com.canchitas.feature.cuentas.recuperacion.RecuperacionUiState
import com.canchitas.feature.cuentas.registro.AccionesDeRegistro
import com.canchitas.feature.cuentas.registro.CampoDeRegistro
import com.canchitas.feature.cuentas.registro.FormularioDeRegistro
import com.canchitas.feature.cuentas.registro.RegistroScreen
import com.canchitas.feature.cuentas.registro.RegistroUiState
import com.github.takahirom.roborazzi.captureRoboImage
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Cada estado de las pantallas de cuentas, en claro y en oscuro (RF-001 a RF-007). */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(qualifiers = "w360dp-h900dp-xhdpi")
class CuentasScreenshotTest {
    @get:Rule
    val composeRule = createComposeRule()

    private fun capturar(nombre: String, contenido: @Composable () -> Unit) {
        var oscuro by mutableStateOf(false)
        composeRule.setContent {
            CanchitasTheme(darkTheme = oscuro) {
                // La sección de cuenta no tiene fondo propio: en la app va sobre el del inicio.
                Surface(color = MaterialTheme.colorScheme.background) { contenido() }
            }
        }
        composeRule.onRoot().captureRoboImage("src/test/screenshots/${nombre}_claro.png")
        oscuro = true
        composeRule.waitForIdle()
        composeRule.onRoot().captureRoboImage("src/test/screenshots/${nombre}_oscuro.png")
    }

    private val completo =
        FormularioDeRegistro("ana@mail.com", "una-contrasena", "ana_10", "1995-05-20", true)
    private val cuenta = Cuenta("id", "ana@mail.com", "ana_10", EstadoDeCuenta.Activa)

    private fun registro(nombre: String, estado: RegistroUiState) =
        capturar("registro_$nombre") { RegistroScreen(estado, AccionesDeRegistro()) }

    private fun ingreso(nombre: String, estado: IngresoUiState) =
        capturar("ingreso_$nombre") { IngresoScreen(estado, AccionesDeIngreso()) }

    private fun recuperacion(nombre: String, estado: RecuperacionUiState) =
        capturar("recuperacion_$nombre") { RecuperacionScreen(estado, {}, {}, {}) }

    private fun cuenta(nombre: String, estado: CuentaUiState) =
        capturar("cuenta_$nombre") { CuentaSection(estado, {}, {}) }

    @Test
    fun registroVacio() = registro("vacio", RegistroUiState.Editando())

    @Test
    fun registroConErrores() = registro(
        "con_errores",
        RegistroUiState.Editando(
            formulario = FormularioDeRegistro(email = "ana@", nombreUsuario = "ana perez"),
            errores = mapOf(
                CampoDeRegistro.Email to R.string.feature_cuentas_validacion_email,
                CampoDeRegistro.Contrasena to R.string.feature_cuentas_validacion_contrasena_corta,
                CampoDeRegistro.NombreUsuario to R.string.feature_cuentas_validacion_nombre_usuario,
                CampoDeRegistro.FechaNacimiento to R.string.feature_cuentas_obligatorio,
                CampoDeRegistro.Privacidad to R.string.feature_cuentas_validacion_privacidad
            )
        )
    )

    @Test
    fun registroEnviando() =
        registro("enviando", RegistroUiState.Editando(completo, enviando = true))

    @Test
    fun registroMenorDeEdad() = registro(
        "menor_de_edad",
        RegistroUiState.Editando(
            completo.copy(fechaNacimiento = "2010-03-01"),
            errores = mapOf(
                CampoDeRegistro.FechaNacimiento to R.string.feature_cuentas_error_menor_de_edad
            )
        )
    )

    @Test
    fun registroSinConexion() =
        registro("sin_conexion", RegistroUiState.Editando(completo, error = ErrorDeApi.SinConexion))

    @Test
    fun registroListo() = registro("listo", RegistroUiState.Listo("ana@mail.com"))

    @Test
    fun registroReenviado() =
        registro("reenviado", RegistroUiState.Listo("ana@mail.com", EstadoDeReenvio.Enviado))

    @Test
    fun ingresoVacio() = ingreso("vacio", IngresoUiState.Editando())

    @Test
    fun ingresoConErrores() = ingreso(
        "con_errores",
        IngresoUiState.Editando(
            email = "ana@",
            errores = mapOf(
                CampoDeIngreso.Email to R.string.feature_cuentas_validacion_email,
                CampoDeIngreso.Contrasena to R.string.feature_cuentas_obligatorio
            )
        )
    )

    @Test
    fun ingresoEnviando() =
        ingreso("enviando", IngresoUiState.Editando("ana@mail.com", "clave", enviando = true))

    @Test
    fun ingresoCredencialesInvalidas() = ingreso(
        "credenciales_invalidas",
        IngresoUiState.Editando("ana@mail.com", error = ErrorDeApi.Api("credenciales-invalidas"))
    )

    @Test
    fun ingresoBloqueado() = ingreso(
        "bloqueado",
        IngresoUiState.Editando("ana@mail.com", error = ErrorDeApi.Api("cuenta-bloqueada"))
    )

    @Test
    fun recuperacionVacia() = recuperacion("vacia", RecuperacionUiState.Editando())

    @Test
    fun recuperacionConError() = recuperacion(
        "con_error",
        RecuperacionUiState.Editando(
            "ana@",
            errorDeCampo = R.string.feature_cuentas_validacion_email
        )
    )

    @Test
    fun recuperacionEnviando() =
        recuperacion("enviando", RecuperacionUiState.Editando("ana@mail.com", enviando = true))

    @Test
    fun recuperacionEnviada() = recuperacion("enviada", RecuperacionUiState.Enviado)

    @Test
    fun cuentaConsultando() = cuenta("consultando", CuentaUiState.Loading)

    @Test
    fun cuentaActiva() = cuenta("activa", CuentaUiState.ConSesion(cuenta))

    @Test
    fun cuentaSinVerificar() = cuenta(
        "sin_verificar",
        CuentaUiState.ConSesion(cuenta.copy(estado = EstadoDeCuenta.SinVerificar))
    )

    @Test
    fun cuentaReenviado() = cuenta(
        "reenviado",
        CuentaUiState.ConSesion(
            cuenta.copy(estado = EstadoDeCuenta.SinVerificar),
            reenvio = EstadoDeReenvio.Enviado
        )
    )

    @Test
    fun cuentaCerrando() = cuenta("cerrando", CuentaUiState.ConSesion(cuenta, cerrando = true))

    @Test
    fun cuentaCierreSinConexion() = cuenta(
        "cierre_sin_conexion",
        CuentaUiState.ConSesion(cuenta, error = ErrorDeApi.SinConexion)
    )

    @Test
    fun privacidad() = capturar("privacidad") { PrivacidadScreen(onVolver = {}) }
}
