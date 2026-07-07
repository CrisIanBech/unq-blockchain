package com.blockrent.smartlock.protocol

import org.json.JSONObject
import java.security.SecureRandom

object SmartlockProtocol {
    const val PROTOCOL_VERSION = 1
    const val CHALLENGE_MIME = "application/vnd.blockrent.challenge+json"
    const val RESPONSE_MIME = "application/vnd.blockrent.response+json"

    data class Challenge(
        val propertyId: String,
        val lockId: String,
        val nonce: String,
        val timestamp: Long,
        val chainId: Int,
        val action: String = "unlock",
        val version: Int = PROTOCOL_VERSION,
    )

    fun createChallenge(propertyId: String, lockId: String, chainId: Int): Challenge {
        val nonceBytes = ByteArray(32)
        SecureRandom().nextBytes(nonceBytes)
        val nonce = "0x" + nonceBytes.joinToString("") { "%02x".format(it) }
        return Challenge(
            propertyId = propertyId,
            lockId = lockId,
            nonce = nonce,
            timestamp = System.currentTimeMillis() / 1000,
            chainId = chainId,
        )
    }

    fun encodeChallenge(challenge: Challenge): String {
        return JSONObject()
            .put("v", challenge.version)
            .put("propertyId", challenge.propertyId)
            .put("lockId", challenge.lockId)
            .put("nonce", challenge.nonce)
            .put("timestamp", challenge.timestamp)
            .put("chainId", challenge.chainId)
            .put("action", challenge.action)
            .toString()
    }

    fun decodeChallenge(json: String): Challenge {
        val obj = JSONObject(json)
        if (obj.getInt("v") != PROTOCOL_VERSION) {
            throw IllegalArgumentException("Unsupported protocol version")
        }
        return Challenge(
            propertyId = obj.getString("propertyId"),
            lockId = obj.getString("lockId"),
            nonce = obj.getString("nonce"),
            timestamp = obj.getLong("timestamp"),
            chainId = obj.getInt("chainId"),
            action = obj.getString("action"),
            version = obj.getInt("v"),
        )
    }
}
