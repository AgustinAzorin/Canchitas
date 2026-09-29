package com.canchitas.core.database.model

import androidx.room3.ColumnInfo
import androidx.room3.Entity
import androidx.room3.PrimaryKey

/** Un grupo del usuario, como viene en "Tus grupos" (RF-010, RF-011). */
@Entity(tableName = "grupo")
data class GrupoEntity(
    @PrimaryKey val id: String,
    val nombre: String,
    @ColumnInfo(name = "cantidad_miembros") val cantidadMiembros: Int,
    /** Nombre de `RolEnGrupo`. */
    val rol: String
)

/**
 * Lo que solo trae el detalle del grupo: el link, si el rol lo ve (RN-26), y las acciones que la
 * API permite (RN-07). Se guarda aparte para que actualizar la lista no lo pise.
 */
@Entity(tableName = "detalle_de_grupo")
data class DetalleDeGrupoEntity(
    @PrimaryKey @ColumnInfo(name = "grupo_id") val grupoId: String,
    val link: String?,
    /** Nombres de `AccionDeGrupo`, separados por coma. */
    val acciones: String
)

/** Grupo con su detalle, para la pantalla del grupo. */
data class GrupoConDetalle(
    val id: String,
    val nombre: String,
    @ColumnInfo(name = "cantidad_miembros") val cantidadMiembros: Int,
    val rol: String,
    val link: String?,
    val acciones: String
)
