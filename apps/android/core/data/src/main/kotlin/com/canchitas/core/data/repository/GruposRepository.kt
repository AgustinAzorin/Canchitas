package com.canchitas.core.data.repository

import com.canchitas.core.database.dao.GrupoDao
import com.canchitas.core.database.model.DetalleDeGrupoEntity
import com.canchitas.core.database.model.GrupoConDetalle
import com.canchitas.core.database.model.GrupoEntity
import com.canchitas.core.model.AccionDeGrupo
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.model.RolEnGrupo
import com.canchitas.core.model.Union
import com.canchitas.core.network.grupos.GruposNetworkDataSource
import javax.inject.Inject
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Grupos en Android (RF-010, RF-011, RF-012). Se leen de Room y la red los actualiza (RNF-022):
 * sin conexión se ven los grupos ya cargados. Las escrituras exigen red. Los permisos (link,
 * acciones) vienen de la API y se guardan tal cual.
 */
interface GruposRepository {
    val misGrupos: Flow<List<ResumenDeGrupo>>

    /** `null` mientras no se haya cargado el grupo con su detalle. */
    fun grupo(id: String): Flow<Grupo?>

    suspend fun actualizarMisGrupos(): Resultado<Unit>

    suspend fun actualizarGrupo(id: String): Resultado<Unit>

    suspend fun crearGrupo(nombre: String): Resultado<Grupo>

    suspend fun regenerarLink(id: String): Resultado<Grupo>

    /** La vista previa del link se pide a la API cada vez: no es un dato del usuario (RN-27). */
    suspend fun invitacion(token: String): Resultado<Invitacion>

    suspend fun unirse(token: String): Resultado<Union>
}

internal class DefaultGruposRepository @Inject constructor(
    private val network: GruposNetworkDataSource,
    private val dao: GrupoDao
) : GruposRepository {
    override val misGrupos: Flow<List<ResumenDeGrupo>> =
        dao.misGrupos().map { grupos -> grupos.map { it.aModelo() } }

    override fun grupo(id: String): Flow<Grupo?> = dao.grupo(id).map { it?.aModelo() }

    override suspend fun actualizarMisGrupos(): Resultado<Unit> =
        when (val resultado = network.misGrupos()) {
            is Resultado.Exito -> {
                dao.reemplazarMisGrupos(resultado.valor.map { it.aEntidad() })
                Resultado.Exito(Unit)
            }

            is Resultado.Fallo -> resultado
        }

    override suspend fun actualizarGrupo(id: String): Resultado<Unit> =
        when (val resultado = network.grupo(id)) {
            is Resultado.Exito -> {
                guardar(resultado.valor)
                Resultado.Exito(Unit)
            }

            is Resultado.Fallo -> {
                // Ya no es miembro (o el grupo no existe): no se muestra lo que quedó guardado.
                if (resultado.error == GRUPO_NO_ENCONTRADO) dao.olvidar(id)
                resultado
            }
        }

    override suspend fun crearGrupo(nombre: String): Resultado<Grupo> =
        network.crearGrupo(nombre).alGuardar()

    override suspend fun regenerarLink(id: String): Resultado<Grupo> =
        network.regenerarLink(id).alGuardar()

    override suspend fun invitacion(token: String): Resultado<Invitacion> =
        network.invitacion(token)

    override suspend fun unirse(token: String): Resultado<Union> {
        val resultado = network.unirse(token)
        if (resultado is Resultado.Exito) actualizarGrupo(resultado.valor.grupoId)
        return resultado
    }

    private suspend fun Resultado<Grupo>.alGuardar(): Resultado<Grupo> {
        if (this is Resultado.Exito) guardar(valor)
        return this
    }

    private suspend fun guardar(grupo: Grupo) {
        dao.guardarGrupo(
            ResumenDeGrupo(grupo.id, grupo.nombre, grupo.cantidadMiembros, grupo.rol).aEntidad(),
            DetalleDeGrupoEntity(
                grupoId = grupo.id,
                link = grupo.link,
                acciones = grupo.acciones.joinToString(",") { it.name }
            )
        )
    }

    private companion object {
        val GRUPO_NO_ENCONTRADO = ErrorDeApi.Api("grupo-no-encontrado")
    }
}

private fun ResumenDeGrupo.aEntidad() = GrupoEntity(id, nombre, cantidadMiembros, rol.name)

private fun GrupoEntity.aModelo() =
    ResumenDeGrupo(id, nombre, cantidadMiembros, RolEnGrupo.valueOf(rol))

private fun GrupoConDetalle.aModelo() = Grupo(
    id = id,
    nombre = nombre,
    cantidadMiembros = cantidadMiembros,
    rol = RolEnGrupo.valueOf(rol),
    link = link,
    acciones = acciones.split(',')
        .filter { it.isNotEmpty() }
        .mapNotNull { nombre -> AccionDeGrupo.entries.find { it.name == nombre } }
        .toSet()
)
