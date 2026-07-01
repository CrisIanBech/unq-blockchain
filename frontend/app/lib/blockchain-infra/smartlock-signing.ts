import { ethers } from "ethers";
import {
  challengeToTypedData,
  decodeChallengePayload,
  encodeResponsePayload,
  isChallengeFresh,
  UNLOCK_CHALLENGE_TYPES,
  type SmartlockChallenge,
  type SmartlockResponse,
} from "@shared/smartlock-protocol/index";
import { CONTRACT_ADDRESSES } from "./addresses";
import { getSigner } from "./provider";

export async function signUnlockChallenge(challenge: SmartlockChallenge): Promise<SmartlockResponse> {
  const signer = await getSigner();
  if (!signer) {
    throw new Error("No signer available. Connect MetaMask.");
  }

  const verifyingContract = CONTRACT_ADDRESSES.propertyNft;
  if (!verifyingContract) {
    throw new Error("Property NFT contract address is not configured.");
  }

  const typedData = challengeToTypedData(challenge, verifyingContract);
  const signature = await signer.signTypedData(
    typedData.domain,
    { UnlockChallenge: [...UNLOCK_CHALLENGE_TYPES.UnlockChallenge] },
    typedData.message
  );

  const signerAddress = await signer.getAddress();

  return {
    v: 1,
    propertyId: challenge.propertyId,
    lockId: challenge.lockId,
    nonce: challenge.nonce,
    signer: signerAddress,
    signature,
  };
}

export function verifyUnlockSignature(
  challenge: SmartlockChallenge,
  response: SmartlockResponse,
  verifyingContract: string
): string {
  if (!isChallengeFresh(challenge)) {
    throw new Error("Challenge expired. Tap the lock again.");
  }

  if (response.nonce !== challenge.nonce) {
    throw new Error("Response nonce does not match challenge.");
  }

  const typedData = challengeToTypedData(challenge, verifyingContract);
  const recovered = ethers.verifyTypedData(
    typedData.domain,
    { UnlockChallenge: [...UNLOCK_CHALLENGE_TYPES.UnlockChallenge] },
    typedData.message,
    response.signature
  );

  if (recovered.toLowerCase() !== response.signer.toLowerCase()) {
    throw new Error("Signature does not match claimed signer.");
  }

  return recovered;
}

export function parseChallengeFromNfcPayload(raw: string | ArrayBuffer): SmartlockChallenge {
  return decodeChallengePayload(raw);
}

export function buildNfcResponsePayload(response: SmartlockResponse): string {
  return encodeResponsePayload(response);
}

export { challengeToTypedData, isChallengeFresh };
export type { SmartlockChallenge, SmartlockResponse };
