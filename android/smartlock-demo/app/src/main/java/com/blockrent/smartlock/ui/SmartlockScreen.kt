package com.blockrent.smartlock.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Nfc
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.blockrent.smartlock.R
import com.blockrent.smartlock.model.SmartlockRole
import com.blockrent.smartlock.ui.components.BlockRentAssistChip
import com.blockrent.smartlock.ui.components.BlockRentCard
import com.blockrent.smartlock.ui.components.RoleModeSwitch
import com.blockrent.smartlock.ui.theme.BlockRentColors
import com.blockrent.smartlock.ui.theme.BlockRentMono
import com.blockrent.smartlock.ui.theme.PillShape

@Composable
fun SmartlockScreen(
    uiState: SmartlockUiState,
    onPropertyIdChange: (String) -> Unit,
    onAgreementChange: (String) -> Unit,
    onRoleChange: (SmartlockRole) -> Unit,
    onReadNfc: () -> Unit,
    onSimulateLock: () -> Unit,
    onSignWithMetamask: () -> Unit,
) {
    val keyMode = uiState.role == SmartlockRole.TENANT
    val accent = if (keyMode) BlockRentColors.Tertiary else BlockRentColors.Primary
    val accentContainer = if (keyMode) BlockRentColors.TertiaryContainer else BlockRentColors.PrimaryContainer
    val onAccentContainer = if (keyMode) BlockRentColors.OnTertiaryContainer else BlockRentColors.OnPrimaryContainer

    Scaffold(
        containerColor = BlockRentColors.Background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 20.dp, vertical = 16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(
                    text = stringResource(R.string.page_title),
                    style = MaterialTheme.typography.headlineLarge,
                    color = BlockRentColors.OnBackground,
                )
                Text(
                    text = stringResource(R.string.page_subtitle),
                    style = MaterialTheme.typography.bodyLarge,
                    color = BlockRentColors.OnSurfaceVariant,
                )
            }

            RoleModeSwitch(
                selectedRole = uiState.role,
                onRoleChange = onRoleChange,
            )

            BlockRentCard(keyMode = keyMode) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        imageVector = Icons.Rounded.Nfc,
                        contentDescription = null,
                        tint = accent,
                        modifier = Modifier.size(22.dp),
                    )
                    Text(
                        text = uiState.nfcStatus,
                        style = MaterialTheme.typography.bodyMedium,
                        color = BlockRentColors.OnSurfaceVariant,
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))

                BlockRentAssistChip(
                    label = if (keyMode) {
                        stringResource(R.string.chip_key_linked)
                    } else {
                        stringResource(R.string.chip_lock_registered)
                    },
                    containerColor = accentContainer,
                    contentColor = onAccentContainer,
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = uiState.propertyId,
                    onValueChange = onPropertyIdChange,
                    label = { Text(stringResource(R.string.hint_property_id)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = MaterialTheme.shapes.medium,
                    colors = outlinedFieldColors(),
                )

                OutlinedTextField(
                    value = uiState.agreementAddress,
                    onValueChange = onAgreementChange,
                    label = { Text(stringResource(R.string.hint_agreement)) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = MaterialTheme.shapes.medium,
                    colors = outlinedFieldColors(),
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    OutlinedButton(
                        onClick = onReadNfc,
                        enabled = uiState.nfcHardwareAvailable && uiState.nfcEnabledOnDevice,
                        modifier = Modifier.weight(1f),
                        shape = PillShape,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = accent),
                    ) {
                        Text(stringResource(R.string.button_read))
                    }
                    Button(
                        onClick = onSimulateLock,
                        enabled = uiState.nfcHardwareAvailable && uiState.nfcEnabledOnDevice,
                        modifier = Modifier.weight(1f),
                        shape = PillShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = accent,
                            contentColor = BlockRentColors.OnPrimary,
                        ),
                    ) {
                        Text(stringResource(R.string.button_write))
                    }
                }

                if (uiState.statusMessage.isNotBlank()) {
                    Text(
                        text = uiState.statusMessage,
                        style = MaterialTheme.typography.bodyMedium,
                        color = BlockRentColors.OnSurfaceVariant,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = MaterialTheme.shapes.medium,
                    color = BlockRentColors.SurfaceContainerHigh,
                ) {
                    SelectionContainer {
                        Text(
                            text = uiState.challengeJson ?: stringResource(R.string.challenge_empty),
                            modifier = Modifier.padding(14.dp),
                            fontFamily = BlockRentMono,
                            style = MaterialTheme.typography.bodySmall,
                            color = BlockRentColors.OnSurface,
                        )
                    }
                }

                if (uiState.showSignButton) {
                    Button(
                        onClick = onSignWithMetamask,
                        modifier = Modifier.fillMaxWidth(),
                        shape = PillShape,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (keyMode) BlockRentColors.Tertiary else BlockRentColors.Primary,
                            contentColor = BlockRentColors.OnPrimary,
                        ),
                    ) {
                        Text(stringResource(R.string.button_sign_metamask))
                    }
                }
            }

            Text(
                text = stringResource(R.string.flow_hint),
                style = MaterialTheme.typography.bodySmall,
                color = BlockRentColors.OnSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun outlinedFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = BlockRentColors.Primary,
    unfocusedBorderColor = BlockRentColors.OutlineVariant,
    focusedLabelColor = BlockRentColors.Primary,
    cursorColor = BlockRentColors.Primary,
)
