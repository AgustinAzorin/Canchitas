package com.canchitas.core.model

/** Rol en un grupo: es por grupo (SUP-04). */
enum class RolEnGrupo { Jugador, Admin }

/**
 * Acción que el rol permite en el grupo, según la API (RN-07, RN-26). La app muestra solo estas:
 * no decide permisos.
 */
enum class AccionDeGrupo {
    VerLink,
    RegenerarLink,
    CrearVotacion,
    CrearPartido,
    ArmarEquipos,
    CargarResultado,
    RegistrarCosto,
    MarcarPago
}

/** Un grupo en la lista de "Tus grupos" (RF-010, RF-011). */
data class ResumenDeGrupo(
    val id: String,
    val nombre: String,
    val cantidadMiembros: Int,
    val rol: RolEnGrupo
)

/** Un grupo como lo ve su miembro. `link` es null si su rol no lo ve (RN-26). */
data class Grupo(
    val id: String,
    val nombre: String,
    val cantidadMiembros: Int,
    val rol: RolEnGrupo,
    val link: String?,
    val acciones: Set<AccionDeGrupo>
)

/** Qué pasa si acepta la invitación, según la API (RF-011, RF-004, RN-28). */
enum class EstadoDeInvitacion { PuedeUnirse, YaEsMiembro, CuentaSinVerificar, Expulsado }

/** Vista previa del link, solo con sesión (RN-27). */
data class Invitacion(
    val grupoId: String,
    val nombre: String,
    val cantidadMiembros: Int,
    val estado: EstadoDeInvitacion
)

/** Resultado de unirse por link: si ya era miembro, no se duplicó la membresía (RF-011). */
data class Union(val grupoId: String, val yaEraMiembro: Boolean)
