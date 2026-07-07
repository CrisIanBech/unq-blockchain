package com.blockrent.smartlock.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val BlockRentLightScheme = lightColorScheme(
    primary = BlockRentColors.Primary,
    onPrimary = BlockRentColors.OnPrimary,
    primaryContainer = BlockRentColors.PrimaryContainer,
    onPrimaryContainer = BlockRentColors.OnPrimaryContainer,
    secondary = BlockRentColors.Secondary,
    onSecondary = BlockRentColors.OnSecondary,
    secondaryContainer = BlockRentColors.SecondaryContainer,
    onSecondaryContainer = BlockRentColors.OnSecondaryContainer,
    tertiary = BlockRentColors.Tertiary,
    onTertiary = BlockRentColors.OnTertiary,
    tertiaryContainer = BlockRentColors.TertiaryContainer,
    onTertiaryContainer = BlockRentColors.OnTertiaryContainer,
    error = BlockRentColors.Error,
    onError = BlockRentColors.OnError,
    errorContainer = BlockRentColors.ErrorContainer,
    onErrorContainer = BlockRentColors.OnErrorContainer,
    background = BlockRentColors.Background,
    onBackground = BlockRentColors.OnBackground,
    surface = BlockRentColors.Surface,
    onSurface = BlockRentColors.OnSurface,
    surfaceVariant = BlockRentColors.SurfaceVariant,
    onSurfaceVariant = BlockRentColors.OnSurfaceVariant,
    outline = BlockRentColors.Outline,
    outlineVariant = BlockRentColors.OutlineVariant,
    surfaceContainerLow = BlockRentColors.SurfaceContainerLow,
    surfaceContainer = BlockRentColors.SurfaceContainer,
    surfaceContainerHigh = BlockRentColors.SurfaceContainerHigh,
    surfaceContainerHighest = BlockRentColors.SurfaceContainerHighest,
)

@Composable
fun BlockRentSmartlockTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = BlockRentColors.Background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = true
        }
    }

    MaterialTheme(
        colorScheme = BlockRentLightScheme,
        typography = BlockRentTypography,
        shapes = BlockRentShapes,
        content = content,
    )
}
