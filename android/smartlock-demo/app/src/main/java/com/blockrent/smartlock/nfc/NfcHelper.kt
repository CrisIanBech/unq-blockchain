package com.blockrent.smartlock.nfc

import android.app.Activity
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import com.blockrent.smartlock.protocol.SmartlockProtocol
import java.nio.charset.Charset

class NfcHelper(private val activity: Activity) {
    private var nfcAdapter: NfcAdapter? = NfcAdapter.getDefaultAdapter(activity)

    fun isNfcAvailable(): Boolean = nfcAdapter != null

    fun isNfcEnabled(): Boolean = nfcAdapter?.isEnabled == true

    fun enableReaderMode(onTagDiscovered: (Tag) -> Unit) {
        val adapter = nfcAdapter ?: return
        adapter.enableReaderMode(
            activity,
            { tag -> activity.runOnUiThread { onTagDiscovered(tag) } },
            NfcAdapter.FLAG_READER_NFC_A or
                NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null,
        )
    }

    /** @deprecated Use [enableReaderMode] with tag handler for read/write routing */
    fun enableReaderModeLegacy(onTagRead: (String) -> Unit) {
        enableReaderMode { tag ->
            val payload = readChallengeFromTag(tag) ?: return@enableReaderMode
            onTagRead(payload)
        }
    }

    fun disableReaderMode() {
        nfcAdapter?.disableReaderMode(activity)
    }

    fun readChallengeFromTag(tag: Tag): String? {
        val ndef = Ndef.get(tag) ?: return null
        ndef.connect()
        try {
            val message = ndef.ndefMessage ?: return null
            return parseChallengeFromNdef(message)
        } finally {
            ndef.close()
        }
    }

    fun parseChallengeFromNdef(message: NdefMessage): String? {
        for (record in message.records) {
            if (record.tnf == NdefRecord.TNF_MIME_MEDIA) {
                val mimeType = String(record.type, Charset.forName("US-ASCII"))
                if (mimeType == SmartlockProtocol.CHALLENGE_MIME) {
                    return String(record.payload, Charset.forName("UTF-8"))
                }
            }
            if (record.tnf == NdefRecord.TNF_WELL_KNOWN &&
                record.type.contentEquals(NdefRecord.RTD_TEXT)
            ) {
                val payload = record.payload
                val textEncoding = if (payload[0].toInt() and 0x80 == 0) "UTF-8" else "UTF-16"
                val languageLength = payload[0].toInt() and 0x3F
                return String(
                    payload,
                    languageLength + 1,
                    payload.size - languageLength - 1,
                    Charset.forName(textEncoding),
                )
            }
        }
        return null
    }

    fun writeChallengeToTag(tag: Tag, challengeJson: String): Boolean {
        val mimeRecord = NdefRecord.createMime(
            SmartlockProtocol.CHALLENGE_MIME,
            challengeJson.toByteArray(Charset.forName("UTF-8")),
        )
        val message = NdefMessage(arrayOf(mimeRecord))

        val ndef = Ndef.get(tag)
        if (ndef != null) {
            ndef.connect()
            try {
                if (!ndef.isWritable) return false
                if (ndef.maxSize < message.byteArrayLength) return false
                ndef.writeNdefMessage(message)
                return true
            } finally {
                ndef.close()
            }
        }

        val formatable = NdefFormatable.get(tag) ?: return false
        formatable.connect()
        try {
            formatable.format(message)
            return true
        } finally {
            formatable.close()
        }
    }
}
