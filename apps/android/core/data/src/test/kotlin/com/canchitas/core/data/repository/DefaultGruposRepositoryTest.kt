package com.canchitas.core.data.repository

import androidx.room3.Room
import androidx.test.core.app.ApplicationProvider
import com.canchitas.core.database.CanchitasDatabase
import com.canchitas.core.model.AccionDeGrupo
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.model.RolEnGrupo
import com.canchitas.core.model.Union
import com.canchitas.core.network.grupos.GruposNetworkDataSource
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Grupos con Room en memoria como fuente de verdad (ADR 0011, RNF-022) y la red falsa. */
@RunWith(RobolectricTestRunner::class)
class DefaultGruposRepositoryTest {
    private val database = Room.inMemoryDatabaseBuilder(
        ApplicationProvider.getApplicationContext(),
        CanchitasDatabase::class.java
    ).build()
    private val red = RedFalsa()
    private val repositorio = DefaultGruposRepository(red, database.grupoDao())

    private val deAdmin = Grupo(
        id = "g1",
        nombre = "Los del jueves",
        cantidadMiembros = 1,
        rol = RolEnGrupo.Admin,
        link = "https://canchitas.app/i/abc",
        acciones = setOf(AccionDeGrupo.VerLink, AccionDeGrupo.RegenerarLink)
    )

    private class RedFalsa : GruposNetworkDataSource {
        var lista: Resultado<List<ResumenDeGrupo>> = Resultado.Exito(emptyList())
        var detalle: Resultado<Grupo> = Resultado.Fallo(ErrorDeApi.Inesperado)
        var creado: Resultado<Grupo> = Resultado.Fallo(ErrorDeApi.Inesperado)
        var regenerado: Resultado<Grupo> = Resultado.Fallo(ErrorDeApi.Inesperado)
        var union: Resultado<Union> = Resultado.Fallo(ErrorDeApi.Inesperado)

        override suspend fun misGrupos() = lista

        override suspend fun grupo(grupoId: String) = detalle

        override suspend fun crearGrupo(nombre: String) = creado

        override suspend fun regenerarLink(grupoId: String) = regenerado

        override suspend fun invitacion(token: String): Resultado<Invitacion> =
            Resultado.Fallo(ErrorDeApi.Api("link-invalido"))

        override suspend fun unirse(token: String) = union
    }

    @After
    fun cerrar() = database.close()

    @Test
    fun `RF-010 - el grupo creado queda guardado con su link y sus acciones`() = runTest {
        red.creado = Resultado.Exito(deAdmin)

        assertEquals(Resultado.Exito(deAdmin), repositorio.crearGrupo("Los del jueves"))

        assertEquals(deAdmin, repositorio.grupo("g1").first())
        assertEquals(
            listOf(ResumenDeGrupo("g1", "Los del jueves", 1, RolEnGrupo.Admin)),
            repositorio.misGrupos.first()
        )
    }

    @Test
    fun `RNF-022 - sin red se siguen viendo los grupos ya cargados`() = runTest {
        red.lista =
            Resultado.Exito(listOf(ResumenDeGrupo("g1", "Los del jueves", 3, RolEnGrupo.Jugador)))
        repositorio.actualizarMisGrupos()
        red.lista = Resultado.Fallo(ErrorDeApi.SinConexion)

        assertEquals(Resultado.Fallo(ErrorDeApi.SinConexion), repositorio.actualizarMisGrupos())
        assertEquals("Los del jueves", repositorio.misGrupos.first().single().nombre)
    }

    @Test
    fun `RF-011 - la lista de la API reemplaza la guardada sin pisar el detalle`() = runTest {
        red.creado = Resultado.Exito(deAdmin)
        repositorio.crearGrupo("Los del jueves")
        red.lista = Resultado.Exito(
            listOf(
                ResumenDeGrupo("g1", "Los del jueves", 2, RolEnGrupo.Admin),
                ResumenDeGrupo("g2", "Fútbol 11", 9, RolEnGrupo.Jugador)
            )
        )

        repositorio.actualizarMisGrupos()

        assertEquals(
            listOf("Fútbol 11", "Los del jueves"),
            repositorio.misGrupos.first().map {
                it.nombre
            }
        )
        assertEquals(deAdmin.copy(cantidadMiembros = 2), repositorio.grupo("g1").first())

        red.lista =
            Resultado.Exito(listOf(ResumenDeGrupo("g2", "Fútbol 11", 9, RolEnGrupo.Jugador)))
        repositorio.actualizarMisGrupos()

        assertNull(repositorio.grupo("g1").first())
    }

    @Test
    fun `RF-012 - el link regenerado reemplaza al guardado`() = runTest {
        red.creado = Resultado.Exito(deAdmin)
        repositorio.crearGrupo("Los del jueves")
        val nuevo = deAdmin.copy(link = "https://canchitas.app/i/nuevo")
        red.regenerado = Resultado.Exito(nuevo)

        repositorio.regenerarLink("g1")

        assertEquals("https://canchitas.app/i/nuevo", repositorio.grupo("g1").first()?.link)
    }

    @Test
    fun `RNF-013 - si la API dice que ya no es miembro, se olvida el grupo guardado`() = runTest {
        red.creado = Resultado.Exito(deAdmin)
        repositorio.crearGrupo("Los del jueves")
        red.detalle = Resultado.Fallo(ErrorDeApi.Api("grupo-no-encontrado"))

        repositorio.actualizarGrupo("g1")

        assertNull(repositorio.grupo("g1").first())
        assertEquals(emptyList<ResumenDeGrupo>(), repositorio.misGrupos.first())
    }

    @Test
    fun `RF-011 - al unirse se guarda el grupo como lo ve el jugador`() = runTest {
        val deJugador = deAdmin.copy(rol = RolEnGrupo.Jugador, link = null, acciones = emptySet())
        red.union = Resultado.Exito(Union("g1", yaEraMiembro = false))
        red.detalle = Resultado.Exito(deJugador)

        assertEquals(Resultado.Exito(Union("g1", false)), repositorio.unirse("abc"))

        assertEquals(deJugador, repositorio.grupo("g1").first())
    }

    @Test
    fun `RF-007 - borrar los datos del usuario deja el dispositivo sin grupos`() = runTest {
        red.creado = Resultado.Exito(deAdmin)
        repositorio.crearGrupo("Los del jueves")

        DatosDelUsuarioEnRoom(database).borrar()

        assertEquals(emptyList<ResumenDeGrupo>(), repositorio.misGrupos.first())
        assertNull(repositorio.grupo("g1").first())
    }
}
