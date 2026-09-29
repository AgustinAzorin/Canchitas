// Generado por scripts/src/tokens desde docs/design-system/tokens.json. No editar.
package com.canchitas.core.designsystem.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf

val LocalExtendedColors = staticCompositionLocalOf { LightExtendedColors }

/** Tema de Canchitas. Sigue el modo del sistema; sin dynamic color, que pisa la marca. */
@Composable
fun CanchitasTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(
        LocalExtendedColors provides if (darkTheme) DarkExtendedColors else LightExtendedColors,
    ) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme,
            typography = CanchitasTypography,
            shapes = CanchitasShapes,
            content = content,
        )
    }
}

object CanchitasTheme {
    val extendedColors: ExtendedColors
        @Composable
        @ReadOnlyComposable
        get() = LocalExtendedColors.current
}
