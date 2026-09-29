package com.canchitas.core.database.dao

import androidx.room3.Dao
import androidx.room3.Query
import androidx.room3.Transaction
import androidx.room3.Upsert
import com.canchitas.core.database.model.DetalleDeGrupoEntity
import com.canchitas.core.database.model.GrupoConDetalle
import com.canchitas.core.database.model.GrupoEntity
import kotlinx.coroutines.flow.Flow

@Dao
abstract class GrupoDao {
    @Query("SELECT * FROM grupo ORDER BY nombre COLLATE NOCASE, id")
    abstract fun misGrupos(): Flow<List<GrupoEntity>>

    @Query(
        """
        SELECT g.id, g.nombre, g.cantidad_miembros, g.rol, d.link, d.acciones
        FROM grupo g JOIN detalle_de_grupo d ON d.grupo_id = g.id
        WHERE g.id = :id
        """
    )
    abstract fun grupo(id: String): Flow<GrupoConDetalle?>

    @Upsert
    protected abstract suspend fun guardarResumenes(grupos: List<GrupoEntity>)

    @Upsert
    protected abstract suspend fun guardarDetalle(detalle: DetalleDeGrupoEntity)

    @Query("DELETE FROM grupo WHERE id NOT IN (:ids)")
    protected abstract suspend fun borrarLosQueNoEstan(ids: List<String>)

    @Query("DELETE FROM grupo WHERE id = :id")
    protected abstract suspend fun borrarGrupo(id: String)

    @Query("DELETE FROM detalle_de_grupo WHERE grupo_id NOT IN (SELECT id FROM grupo)")
    protected abstract suspend fun borrarDetallesSueltos()

    /** La lista de la API es la verdad: los grupos que ya no están se borran con su detalle. */
    @Transaction
    open suspend fun reemplazarMisGrupos(grupos: List<GrupoEntity>) {
        // Con la lista vacía, `NOT IN ()` es verdadero para todas las filas: se borran todos.
        borrarLosQueNoEstan(grupos.map { it.id })
        guardarResumenes(grupos)
        borrarDetallesSueltos()
    }

    @Transaction
    open suspend fun guardarGrupo(grupo: GrupoEntity, detalle: DetalleDeGrupoEntity) {
        guardarResumenes(listOf(grupo))
        guardarDetalle(detalle)
    }

    /** El grupo ya no es visible para el usuario (RNF-013): se borra lo guardado. */
    @Transaction
    open suspend fun olvidar(id: String) {
        borrarGrupo(id)
        borrarDetallesSueltos()
    }
}
