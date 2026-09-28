package com.canchitas.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.rememberNavController
import com.canchitas.core.designsystem.theme.CanchitasTheme
import com.canchitas.feature.salud.navigation.SaludDestino
import com.canchitas.feature.salud.navigation.saludScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CanchitasTheme {
                NavHost(
                    navController = rememberNavController(),
                    startDestination = SaludDestino,
                    modifier = Modifier.safeDrawingPadding()
                ) {
                    saludScreen()
                }
            }
        }
    }
}
