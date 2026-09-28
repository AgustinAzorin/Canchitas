// Generado por scripts/src/tokens desde docs/design-system/tokens.json. No editar.
package com.canchitas.core.designsystem.theme

import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.ui.unit.dp

object Spacing {
    val xs = 4.dp
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val xl = 24.dp
    val xxl = 32.dp
    val xxxl = 48.dp
}

object Elevation {
    val sm = 1.dp
    val md = 3.dp
    val lg = 6.dp
}

object Motion {
    const val DURATION_FAST: Int = 120
    const val DURATION_NORMAL: Int = 200
    const val DURATION_SLOW: Int = 300
    val standard = CubicBezierEasing(0.2f, 0f, 0f, 1f)
    val emphasized = CubicBezierEasing(0.3f, 0f, 0f, 1f)
}
