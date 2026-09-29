package com.canchitas.feature.grupos.navigation

import androidx.navigation.NavController
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable
import com.canchitas.feature.grupos.grupo.GrupoRoute
import com.canchitas.feature.grupos.invitacion.InvitacionRoute
import java.net.URI
import kotlinx.serialization.Serializable

@Serializable
data class GrupoDestino(val grupoId: String)

/** Entrada por link de invitación (RF-011). Solo se navega acá con sesión (RN-27). */
@Serializable
data class InvitacionDestino(val token: String)

/** Pantallas de un grupo y de la invitación. */
fun NavGraphBuilder.gruposGraph(navController: NavController, onIrAlInicio: () -> Unit) {
    composable<GrupoDestino> { GrupoRoute(onVolver = { navController.popBackStack() }) }
    composable<InvitacionDestino> {
        InvitacionRoute(
            onIrAlGrupo = { grupoId ->
                navController.navigate(GrupoDestino(grupoId)) {
                    popUpTo<InvitacionDestino> { inclusive = true }
                }
            },
            onIrAlInicio = onIrAlInicio
        )
    }
}

/** Link de invitación: `https://<dominio>/i/<token>` (RF-011). */
object LinkDeInvitacion {
    private val formatoDelToken = Regex("^[A-Za-z0-9_-]{1,128}$")

    /** El token del link, o `null` si no es un link de invitación. El dominio lo filtra el manifest. */
    fun token(link: String?): String? {
        val ruta = link?.let { runCatching { URI(it) }.getOrNull() }?.path ?: return null
        val partes = ruta.trim('/').split('/')
        return if (partes.size == 2 && partes[0] == "i" && formatoDelToken.matches(partes[1])) {
            partes[1]
        } else {
            null
        }
    }
}
