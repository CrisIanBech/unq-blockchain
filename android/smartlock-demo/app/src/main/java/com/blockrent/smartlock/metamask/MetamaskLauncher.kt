package com.blockrent.smartlock.metamask

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Base64
import androidx.browser.customtabs.CustomTabsIntent
import com.blockrent.smartlock.SmartlockConfig
import com.blockrent.smartlock.model.SmartlockRole
import java.nio.charset.Charset

object MetamaskLauncher {
    fun openSignChallenge(
        context: Context,
        challengeJson: String,
        role: SmartlockRole,
        agreementAddress: String,
    ) {
        val encoded = Base64.encodeToString(
            challengeJson.toByteArray(Charset.forName("UTF-8")),
            Base64.URL_SAFE or Base64.NO_WRAP,
        )
        val urlBuilder = StringBuilder(
            "${SmartlockConfig.DAPP_BASE_URL}/smartlock?challenge=$encoded&role=${role.queryValue}"
        )
        if (agreementAddress.isNotBlank()) {
            urlBuilder.append("&agreement=").append(Uri.encode(agreementAddress))
        }
        val dappUrl = urlBuilder.toString()
        val metamaskUrl = "https://metamask.app.link/dapp/${Uri.encode(dappUrl)}"

        try {
            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(metamaskUrl))
        } catch (_: Exception) {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(metamaskUrl)))
        }
    }
}
