/**
 * BlockRent Smartlock Protocol v1
 *
 * Challenge-response authentication using EIP-712 typed data signing via MetaMask.
 * The lock sends a random nonce over NFC; the phone signs it with the wallet
 * private key; the lock verifies the signature and checks on-chain ownership.
 */

export const SMARTLOCK_PROTOCOL_VERSION = 1 as const;

export const NFC_CHALLENGE_MIME = "application/vnd.blockrent.challenge+json";
export const NFC_RESPONSE_MIME = "application/vnd.blockrent.response+json";

export const EIP712_DOMAIN_NAME = "BlockRent Smartlock";
export const EIP712_DOMAIN_VERSION = "1";

export const SEPOLIA_CHAIN_ID = 11155111;

export interface SmartlockChallenge {
  v: typeof SMARTLOCK_PROTOCOL_VERSION;
  propertyId: string;
  lockId: string;
  nonce: string;
  timestamp: number;
  chainId: number;
  action: "unlock";
}

export interface SmartlockResponse {
  v: typeof SMARTLOCK_PROTOCOL_VERSION;
  propertyId: string;
  lockId: string;
  nonce: string;
  signer: string;
  signature: string;
}

export const UNLOCK_CHALLENGE_TYPES = {
  UnlockChallenge: [
    { name: "propertyId", type: "uint256" },
    { name: "lockId", type: "bytes32" },
    { name: "nonce", type: "bytes32" },
    { name: "timestamp", type: "uint64" },
    { name: "action", type: "string" },
  ],
} as const;

export function buildEip712Domain(chainId: number, verifyingContract: string) {
  return {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

export function challengeToTypedData(challenge: SmartlockChallenge, verifyingContract: string) {
  return {
    domain: buildEip712Domain(challenge.chainId, verifyingContract),
    types: UNLOCK_CHALLENGE_TYPES,
    primaryType: "UnlockChallenge" as const,
    message: {
      propertyId: challenge.propertyId,
      lockId: normalizeBytes32(challenge.lockId),
      nonce: normalizeBytes32(challenge.nonce),
      timestamp: challenge.timestamp,
      action: challenge.action,
    },
  };
}

export function encodeChallengePayload(challenge: SmartlockChallenge): string {
  return JSON.stringify(challenge);
}

export function decodeChallengePayload(raw: string | ArrayBuffer): SmartlockChallenge {
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  const parsed = JSON.parse(text) as SmartlockChallenge;

  if (parsed.v !== SMARTLOCK_PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${parsed.v}`);
  }
  if (parsed.action !== "unlock") {
    throw new Error(`Unsupported action: ${parsed.action}`);
  }
  if (!parsed.propertyId || !parsed.lockId || !parsed.nonce) {
    throw new Error("Invalid challenge: missing required fields");
  }

  return parsed;
}

export function encodeResponsePayload(response: SmartlockResponse): string {
  return JSON.stringify(response);
}

export function decodeResponsePayload(raw: string | ArrayBuffer): SmartlockResponse {
  const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
  const parsed = JSON.parse(text) as SmartlockResponse;

  if (parsed.v !== SMARTLOCK_PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${parsed.v}`);
  }
  if (!parsed.signature || !parsed.signer) {
    throw new Error("Invalid response: missing signature or signer");
  }

  return parsed;
}

export function generateNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function generateLockId(propertyId: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  bytes[0] = Number(BigInt(propertyId) & 0xffn);
  return `0x${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export function createChallenge(propertyId: string, lockId: string, chainId: number): SmartlockChallenge {
  return {
    v: SMARTLOCK_PROTOCOL_VERSION,
    propertyId,
    lockId,
    nonce: generateNonce(),
    timestamp: Math.floor(Date.now() / 1000),
    chainId,
    action: "unlock",
  };
}

/** Challenge is valid for 5 minutes */
export const CHALLENGE_TTL_SECONDS = 300;

const BYTES32_HEX = /^0x[0-9a-fA-F]{64}$/;

/** Coerce protocol string fields to bytes32 for EIP-712 (handles labels like "lock-1"). */
export function normalizeBytes32(value: string): string {
  if (BYTES32_HEX.test(value)) {
    return value.toLowerCase();
  }

  const bytes = new TextEncoder().encode(value);
  if (bytes.length > 32) {
    throw new Error(`Value too long for bytes32: ${value}`);
  }

  const padded = new Uint8Array(32);
  padded.set(bytes);
  return `0x${Array.from(padded, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** Same derivation as the Android lock simulator (property id → bytes32 lock id). */
export function lockIdFromPropertyId(propertyId: string): string {
  const hex = BigInt(propertyId).toString(16);
  return `0x${hex.padStart(64, "0").slice(-64)}`;
}

export function isChallengeFresh(challenge: SmartlockChallenge, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  return nowSeconds - challenge.timestamp <= CHALLENGE_TTL_SECONDS;
}
