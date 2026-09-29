package com.canchitas.core.database

import androidx.room3.Room
import androidx.test.core.app.ApplicationProvider
import com.canchitas.core.database.model.DetalleDeGrupoEntity
import com.canchitas.core.database.model.GrupoConDetalle
import com.canchitas.core.database.model.GrupoEntity
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/** Consultas de grupos en Room (RNF-022): lo guardado es lo que se ve sin conexión. */
@RunWith(RobolectricTestRunner::class)
class GrupoDaoTest {
    private val database = Room.inMemoryDatabaseBuilder(
        ApplicationProvider.getApplicationContext(),
        CanchitasDatabase::class.java
    ).build()
    private val dao = database.grupoDao()

    private val jueves = GrupoEntity("g1", "Los del jueves", 8, "Admin")
    private val domingos = GrupoEntity("g2", "fútbol de los domingos", 3, "Jugador")

    @After
    fun cerrar() = database.close()

    @Test
    fun `RF-010 - los grupos se listan por nombre sin importar mayusculas`() = runTest {
        dao.reemplazarMisGrupos(listOf(jueves, domingos))

        assertEquals(listOf(domingos, jueves), dao.misGrupos().first())
    }

    @Test
    fun `RN-26 - el grupo se ve con su detalle solo cuando el detalle esta guardado`() = runTest {
        dao.reemplazarMisGrupos(listOf(jueves))
        assertNull(dao.grupo("g1").first())

        dao.guardarGrupo(
            jueves,
            DetalleDeGrupoEntity("g1", "https://canchitas.app/i/abc", "VerLink")
        )

        assertEquals(
            GrupoConDetalle(
                "g1",
                "Los del jueves",
                8,
                "Admin",
                "https://canchitas.app/i/abc",
                "VerLink"
            ),
            dao.grupo("g1").first()
        )
    }

    @Test
    fun `RF-011 - una lista vacia de la API borra todos los grupos y sus detalles`() = runTest {
        dao.guardarGrupo(jueves, DetalleDeGrupoEntity("g1", null, ""))
        dao.reemplazarMisGrupos(listOf(domingos))
        assertNull(dao.grupo("g1").first())

        dao.reemplazarMisGrupos(emptyList())

        assertEquals(emptyList<GrupoEntity>(), dao.misGrupos().first())
    }

    @Test
    fun `RNF-013 - olvidar un grupo borra su detalle`() = runTest {
        dao.guardarGrupo(jueves, DetalleDeGrupoEntity("g1", null, ""))

        dao.olvidar("g1")

        assertNull(dao.grupo("g1").first())
        assertEquals(emptyList<GrupoEntity>(), dao.misGrupos().first())
    }
}
