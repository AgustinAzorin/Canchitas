package com.canchitas.core.testing.repository

import com.canchitas.core.data.repository.GruposRepository
import com.canchitas.core.model.ErrorDeApi
import com.canchitas.core.model.Grupo
import com.canchitas.core.model.Invitacion
import com.canchitas.core.model.Resultado
import com.canchitas.core.model.ResumenDeGrupo
import com.canchitas.core.model.Union
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.map

/** Repositorio de grupos controlado desde el test: cada operación responde lo que se le diga. */
class TestGruposRepository : GruposRepository {
    private val lista = MutableStateFlow<List<ResumenDeGrupo>>(emptyList())
    private val grupos = MutableStateFlow<Map<String, Grupo>>(emptyMap())

    override val misGrupos: Flow<List<ResumenDeGrupo>> = lista

    val creados = mutableListOf<String>()
    val regenerados = mutableListOf<String>()
    val uniones = mutableListOf<String>()
    val invitacionesConsultadas = mutableListOf<String>()

    var respuestaDeLista: Resultado<Unit> = Resultado.Exito(Unit)
    var respuestaDeGrupo: Resultado<Unit> = Resultado.Exito(Unit)
    var respuestaDeCreacion: Resultado<Grupo> = Resultado.Fallo(ErrorDeApi.Inesperado)
    var respuestaDeRegeneracion: Resultado<Grupo> = Resultado.Fallo(ErrorDeApi.Inesperado)
    var respuestaDeInvitacion: Resultado<Invitacion> = Resultado.Fallo(ErrorDeApi.Inesperado)
    var respuestaDeUnion: Resultado<Union> = Resultado.Fallo(ErrorDeApi.Inesperado)

    /** Si se completa desde el test, las operaciones esperan hasta entonces (estado "enviando"). */
    var espera: CompletableDeferred<Unit>? = null

    fun cambiarMisGrupos(nuevos: List<ResumenDeGrupo>) {
        lista.value = nuevos
    }

    fun guardar(grupo: Grupo) {
        grupos.value += grupo.id to grupo
    }

    override fun grupo(id: String): Flow<Grupo?> = grupos.map { it[id] }

    override suspend fun actualizarMisGrupos(): Resultado<Unit> = respuestaDeLista

    override suspend fun actualizarGrupo(id: String): Resultado<Unit> = respuestaDeGrupo

    override suspend fun crearGrupo(nombre: String): Resultado<Grupo> {
        creados += nombre
        espera?.await()
        return respuestaDeCreacion.also { if (it is Resultado.Exito) guardar(it.valor) }
    }

    override suspend fun regenerarLink(id: String): Resultado<Grupo> {
        regenerados += id
        espera?.await()
        return respuestaDeRegeneracion.also { if (it is Resultado.Exito) guardar(it.valor) }
    }

    override suspend fun invitacion(token: String): Resultado<Invitacion> {
        invitacionesConsultadas += token
        return respuestaDeInvitacion
    }

    override suspend fun unirse(token: String): Resultado<Union> {
        uniones += token
        espera?.await()
        return respuestaDeUnion
    }
}
