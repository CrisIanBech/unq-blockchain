package com.blockrent.smartlock

import android.app.Application
import android.nfc.Tag
import androidx.lifecycle.AndroidViewModel
import com.blockrent.smartlock.metamask.MetamaskLauncher
import com.blockrent.smartlock.model.SmartlockRole
import com.blockrent.smartlock.protocol.SmartlockProtocol
import com.blockrent.smartlock.ui.SmartlockUiState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class SmartlockViewModel(application: Application) : AndroidViewModel(application) {
    private val _uiState = MutableStateFlow(SmartlockUiState())
    val uiState: StateFlow<SmartlockUiState> = _uiState.asStateFlow()

    private var pendingWriteChallenge: String? = null

    init {
        _uiState.update { it.copy(statusMessage = appString(R.string.status_idle)) }
    }

    fun updateNfcStatus(nfcAvailable: Boolean, nfcEnabled: Boolean) {
        val status = when {
            !nfcAvailable -> appString(R.string.nfc_not_available)
            !nfcEnabled -> appString(R.string.nfc_disabled)
            else -> appString(R.string.nfc_ready)
        }
        _uiState.update {
            it.copy(
                nfcStatus = status,
                nfcHardwareAvailable = nfcAvailable,
                nfcEnabledOnDevice = nfcEnabled,
            )
        }
    }

    fun onPropertyIdChange(value: String) {
        _uiState.update { it.copy(propertyId = value) }
    }

    fun onAgreementChange(value: String) {
        _uiState.update { it.copy(agreementAddress = value) }
    }

    fun onRoleChange(role: SmartlockRole) {
        _uiState.update { it.copy(role = role) }
    }

    fun startReadMode() {
        pendingWriteChallenge = null
        _uiState.update { it.copy(statusMessage = appString(R.string.status_waiting_nfc)) }
    }

    fun prepareLockSimulator() {
        val propertyId = _uiState.value.propertyId.trim()
        if (propertyId.isEmpty()) {
            _uiState.update { it.copy(statusMessage = appString(R.string.error_property_id)) }
            return
        }
        val lockId = "0x" + propertyId.padStart(64, '0').takeLast(64)
        val challenge = SmartlockProtocol.createChallenge(
            propertyId = propertyId,
            lockId = lockId,
            chainId = SmartlockConfig.SEPOLIA_CHAIN_ID,
        )
        val challengeJson = SmartlockProtocol.encodeChallenge(challenge)
        pendingWriteChallenge = challengeJson
        _uiState.update {
            it.copy(
                statusMessage = appString(R.string.status_tap_to_write),
                challengeJson = challengeJson,
                showSignButton = false,
            )
        }
    }

    fun consumePendingWriteChallenge(): String? {
        val pending = pendingWriteChallenge
        pendingWriteChallenge = null
        return pending
    }

    fun peekPendingWriteChallenge(): String? = pendingWriteChallenge

    fun onWriteResult(written: Boolean, challengeJson: String) {
        _uiState.update {
            it.copy(
                statusMessage = if (written) {
                    appString(R.string.status_written)
                } else {
                    appString(R.string.status_write_failed)
                },
                challengeJson = if (written) challengeJson else it.challengeJson,
            )
        }
    }

    fun signWithMetamask() {
        val challenge = _uiState.value.challengeJson
        if (challenge.isNullOrBlank()) {
            _uiState.update { it.copy(statusMessage = appString(R.string.error_no_challenge)) }
            return
        }
        val state = _uiState.value
        MetamaskLauncher.openSignChallenge(
            context = getApplication(),
            challengeJson = challenge,
            role = state.role,
            agreementAddress = state.agreementAddress.trim(),
        )
    }

    fun onChallengePayload(payload: String) {
        try {
            val challenge = SmartlockProtocol.decodeChallenge(payload)
            _uiState.update {
                it.copy(
                    challengeJson = payload,
                    showSignButton = true,
                    statusMessage = appString(
                        R.string.status_read_ok,
                        challenge.propertyId,
                        challenge.nonce.take(10),
                    ),
                )
            }
        } catch (error: Exception) {
            _uiState.update {
                it.copy(
                    statusMessage = appString(R.string.status_invalid_challenge, error.message ?: ""),
                    showSignButton = false,
                )
            }
        }
    }

    private fun appString(resId: Int, vararg args: Any): String {
        return getApplication<Application>().getString(resId, *args)
    }
}
