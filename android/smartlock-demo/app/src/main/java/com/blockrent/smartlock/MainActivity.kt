package com.blockrent.smartlock

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.blockrent.smartlock.nfc.NfcHelper
import com.blockrent.smartlock.ui.SmartlockScreen
import com.blockrent.smartlock.ui.theme.BlockRentSmartlockTheme

class MainActivity : ComponentActivity() {
    private val viewModel: SmartlockViewModel by viewModels()
    private lateinit var nfcHelper: NfcHelper

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        nfcHelper = NfcHelper(this)

        setContent {
            val uiState by viewModel.uiState.collectAsStateWithLifecycle()
            BlockRentSmartlockTheme {
                SmartlockScreen(
                    uiState = uiState,
                    onPropertyIdChange = viewModel::onPropertyIdChange,
                    onAgreementChange = viewModel::onAgreementChange,
                    onRoleChange = viewModel::onRoleChange,
                    onReadNfc = viewModel::startReadMode,
                    onSimulateLock = viewModel::prepareLockSimulator,
                    onSignWithMetamask = viewModel::signWithMetamask,
                )
            }
        }

        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        viewModel.updateNfcStatus(
            nfcAvailable = nfcHelper.isNfcAvailable(),
            nfcEnabled = nfcHelper.isNfcEnabled(),
        )
        if (nfcHelper.isNfcEnabled()) {
            nfcHelper.enableReaderMode { tag -> handleNfcTag(tag) }
        }
    }

    override fun onPause() {
        super.onPause()
        nfcHelper.disableReaderMode()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    private fun handleNfcTag(tag: Tag) {
        val pendingWrite = viewModel.peekPendingWriteChallenge()
        if (pendingWrite != null) {
            viewModel.consumePendingWriteChallenge()
            val written = nfcHelper.writeChallengeToTag(tag, pendingWrite)
            viewModel.onWriteResult(written, pendingWrite)
            return
        }
        nfcHelper.readChallengeFromTag(tag)?.let { payload ->
            viewModel.onChallengePayload(payload)
        }
    }

    private fun handleIntent(intent: Intent?) {
        if (intent == null) return
        val action = intent.action ?: return
        if (action != NfcAdapter.ACTION_NDEF_DISCOVERED &&
            action != NfcAdapter.ACTION_TAG_DISCOVERED &&
            action != NfcAdapter.ACTION_TECH_DISCOVERED
        ) {
            return
        }
        intent.getTagExtra()?.let { handleNfcTag(it) }
    }

    private fun Intent.getTagExtra(): Tag? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java)
        } else {
            @Suppress("DEPRECATION")
            getParcelableExtra(NfcAdapter.EXTRA_TAG)
        }
    }
}
