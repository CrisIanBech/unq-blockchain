package com.blockrent.smartlock.ui

import com.blockrent.smartlock.model.SmartlockRole

data class SmartlockUiState(
    val nfcStatus: String = "",
    val propertyId: String = "1",
    val agreementAddress: String = "",
    val role: SmartlockRole = SmartlockRole.TENANT,
    val statusMessage: String = "",
    val challengeJson: String? = null,
    val nfcHardwareAvailable: Boolean = true,
    val nfcEnabledOnDevice: Boolean = true,
    val showSignButton: Boolean = false,
)
