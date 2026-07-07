# BlockRent Smartlock Protocol

Challenge-response authentication for NFC smart locks using MetaMask (EIP-712 signing).

## Flow

1. Lock generates a random nonce and sends it over NFC as a challenge.
2. Phone reads the challenge and asks MetaMask to sign it (EIP-712).
3. Lock (or phone) verifies the signature and checks on-chain that the signer is the property owner or active tenant.
4. Lock unlocks if authorized.

## Security model

The infographic describes encrypting a random challenge with the tenant's public key and decrypting with the private key. In Ethereum wallets, the equivalent proof is **EIP-712 typed data signing**: MetaMask signs the challenge with the user's private key, and the verifier recovers the signer address via `ecrecover` and checks it against on-chain ownership.

| Role   | On-chain check |
|--------|----------------|
| Landlord | `PropertyNFT.ownerOf(propertyId) == signer` |
| Tenant   | `RentalAgreement.tenant == signer` AND `status == Active` |

Public keys are **not stored on-chain** — wallet addresses (derived from secp256k1 public keys) are the identity.

## NFC payload format

**Challenge** — MIME type `application/vnd.blockrent.challenge+json`:

```json
{
  "v": 1,
  "propertyId": "42",
  "lockId": "0x…",
  "nonce": "0x…",
  "timestamp": 1719763200,
  "chainId": 11155111,
  "action": "unlock"
}
```

**Response** — MIME type `application/vnd.blockrent.response+json`:

```json
{
  "v": 1,
  "propertyId": "42",
  "lockId": "0x…",
  "nonce": "0x…",
  "signer": "0x…",
  "signature": "0x…"
}
```

Challenges expire after **5 minutes**.

## Components

| Path | Description |
|------|-------------|
| `shared/smartlock-protocol/index.ts` | Protocol types and helpers |
| `frontend/app/lib/services/smartlock-service.ts` | MetaMask signing + verification |
| `frontend/app/lib/blockchain-infra/nfc.ts` | Web NFC (Chrome on Android) |
| `android/smartlock-demo/` | Native Android NFC demo |
