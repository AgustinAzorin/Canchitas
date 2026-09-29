package com.canchitas.core.network.grupos

import com.canchitas.core.model.AccionDeGrupo
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.EstadoDeInvitacion
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.model.RolEnGrupo
import com.canchitas.core.model.Union
import com.canchitas.core.network.LlamadorDeApi
import com.canchitas.core.network.generated.apis.GruposApi
import com.canchitas.core.network.generated.models.AccionDeGrupo as AccionDeRed
import com.canchitas.core.network.generated.models.EstadoDeInvitacion as EstadoDeRed
import com.canchitas.core.network.generated.models.Grupo as GrupoDeRed
import com.canchitas.core.network.generated.models.RolEnGrupo as RolDeRed
import com.canchitas.core.network.generated.models.SolicitudDeGrupoInput
import java.util.UUID
import javax.inject.Inject

/** Rutas /v1/grupos y /v1/invitaciones (RF-010, RF-011, RF-012). La API decide los permisos. */
interface GruposNetworkDataSource {
    suspend fun misGrupos(): Resultado<List<ResumenDeGrupo>>

    suspend fun grupo(grupoId: String): Resultado<Grupo>

    suspend fun crearGrupo(nombre: String): Resultado<Grupo>

    suspend fun regenerarLink(grupoId: String): Resultado<Grupo>

    suspend fun invitacion(token: String): Resultado<Invitacion>

    suspend fun unirse(token: String): Resultado<Union>
}

class RetrofitGruposNetwork @Inject constructor(
    private val api: GruposApi,
    private val llamador: LlamadorDeApi
) : GruposNetworkDataSource {
    override suspend fun misGrupos(): Resultado<List<ResumenDeGrupo>> =
        llamador.llamar({ api.listarMisGrupos() }) { lista ->
            lista.grupos.map {
                ResumenDeGrupo(
                    id = it.id.toString(),
                    nombre = it.nombre,
                    cantidadMiembros = it.cantidadMiembros,
                    rol = it.rol.aModelo()
                )
            }
        }

    override suspend fun grupo(grupoId: String): Resultado<Grupo> =
        conId(grupoId) { id -> llamador.llamar({ api.consultarGrupo(id) }) { it.aModelo() } }

    override suspend fun crearGrupo(nombre: String): Resultado<Grupo> =
        llamador.llamar({ api.crearGrupo(SolicitudDeGrupoInput(nombre)) }) { it.aModelo() }

    override suspend fun regenerarLink(grupoId: String): Resultado<Grupo> =
        conId(grupoId) { id -> llamador.llamar({ api.regenerarLink(id) }) { it.aModelo() } }

    override suspend fun invitacion(token: String): Resultado<Invitacion> =
        llamador.llamar({ api.consultarInvitacion(token) }) {
            Invitacion(
                grupoId = it.grupoId.toString(),
                nombre = it.nombre,
                cantidadMiembros = it.cantidadMiembros,
                estado = it.estado.aModelo()
            )
        }

    override suspend fun unirse(token: String): Resultado<Union> =
        llamador.llamar({ api.unirsePorLink(token) }) {
            Union(grupoId = it.grupoId.toString(), yaEraMiembro = it.yaEraMiembro)
        }

    /** Un id que no es un uuid no puede ser de un grupo: la API respondería lo mismo. */
    private suspend fun <T> conId(
        grupoId: String,
        bloque: suspend (UUID) -> Resultado<T>
    ): Resultado<T> {
        val id = runCatching { UUID.fromString(grupoId) }.getOrNull()
            ?: return Resultado.Fallo(GRUPO_NO_ENCONTRADO)
        return bloque(id)
    }

    private companion object {
        val GRUPO_NO_ENCONTRADO = ErrorDeApi.Api("grupo-no-encontrado")
    }
}

private fun GrupoDeRed.aModelo() = Grupo(
    id = id.toString(),
    nombre = nombre,
    cantidadMiembros = cantidadMiembros,
    rol = rol.aModelo(),
    link = link?.toString(),
    acciones = acciones.map { it.aModelo() }.toSet()
)

private fun RolDeRed.aModelo() = when (this) {
    RolDeRed.JUGADOR -> RolEnGrupo.Jugador
    RolDeRed.ADMIN -> RolEnGrupo.Admin
}

private fun AccionDeRed.aModelo() = when (this) {
    AccionDeRed.VER_LINK -> AccionDeGrupo.VerLink
    AccionDeRed.REGENERAR_LINK -> AccionDeGrupo.RegenerarLink
    AccionDeRed.CREAR_VOTACION -> AccionDeGrupo.CrearVotacion
    AccionDeRed.CREAR_PARTIDO -> AccionDeGrupo.CrearPartido
    AccionDeRed.ARMAR_EQUIPOS -> AccionDeGrupo.ArmarEquipos
    AccionDeRed.CARGAR_RESULTADO -> AccionDeGrupo.CargarResultado
    AccionDeRed.REGISTRAR_COSTO -> AccionDeGrupo.RegistrarCosto
    AccionDeRed.MARCAR_PAGO -> AccionDeGrupo.MarcarPago
}

private fun EstadoDeRed.aModelo() = when (this) {
    EstadoDeRed.PUEDE_UNIRSE -> EstadoDeInvitacion.PuedeUnirse
    EstadoDeRed.YA_ES_MIEMBRO -> EstadoDeInvitacion.YaEsMiembro
    EstadoDeRed.CUENTA_SIN_VERIFICAR -> EstadoDeInvitacion.CuentaSinVerificar
    EstadoDeRed.EXPULSADO -> EstadoDeInvitacion.Expulsado
}
