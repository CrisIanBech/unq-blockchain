package com.blockrent.smartlock.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.VpnKey
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.blockrent.smartlock.R
import com.blockrent.smartlock.model.SmartlockRole
import com.blockrent.smartlock.ui.theme.BlockRentColors
import com.blockrent.smartlock.ui.theme.PillShape

@Composable
fun RoleModeSwitch(
    selectedRole: SmartlockRole,
    onRoleChange: (SmartlockRole) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .selectableGroup()
            .clip(PillShape)
            .background(BlockRentColors.SurfaceContainerLow),
    ) {
        ModeSegment(
            selected = selectedRole == SmartlockRole.LANDLORD,
            onClick = { onRoleChange(SmartlockRole.LANDLORD) },
            label = stringResource(R.string.mode_lock),
            icon = Icons.Rounded.Lock,
            selectedTint = BlockRentColors.Primary,
            unselectedTint = BlockRentColors.OnSurfaceVariant.copy(alpha = 0.7f),
            selectedBackground = BlockRentColors.Primary.copy(alpha = 0.12f),
            unselectedBackground = BlockRentColors.Primary.copy(alpha = 0.04f),
            modifier = Modifier.weight(1f),
            roundedStart = true,
        )
        ModeSegment(
            selected = selectedRole == SmartlockRole.TENANT,
            onClick = { onRoleChange(SmartlockRole.TENANT) },
            label = stringResource(R.string.mode_key),
            icon = Icons.Rounded.VpnKey,
            selectedTint = BlockRentColors.Tertiary,
            unselectedTint = BlockRentColors.OnSurfaceVariant.copy(alpha = 0.7f),
            selectedBackground = BlockRentColors.Tertiary.copy(alpha = 0.12f),
            unselectedBackground = BlockRentColors.Tertiary.copy(alpha = 0.04f),
            modifier = Modifier.weight(1f),
            roundedStart = false,
        )
    }
}

@Composable
private fun ModeSegment(
    selected: Boolean,
    onClick: () -> Unit,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selectedTint: Color,
    unselectedTint: Color,
    selectedBackground: Color,
    unselectedBackground: Color,
    modifier: Modifier = Modifier,
    roundedStart: Boolean,
) {
    val shape = if (roundedStart) {
        PillShape
    } else {
        PillShape
    }
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = shape,
        color = if (selected) selectedBackground else unselectedBackground,
        contentColor = if (selected) selectedTint else unselectedTint,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = if (selected) selectedTint else unselectedTint)
            Text(
                text = label,
                modifier = Modifier.padding(start = 8.dp),
                style = MaterialTheme.typography.labelLarge,
                color = if (selected) selectedTint else unselectedTint,
            )
        }
    }
}
