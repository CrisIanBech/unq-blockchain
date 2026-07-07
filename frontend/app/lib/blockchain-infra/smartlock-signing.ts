import { getAccount, signTypedData } from "@wagmi/core";
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
import { wagmiConfig } from "./wagmi-config";

async function signWithWagmi(
  challenge: SmartlockChallenge,
  verifyingContract: string,
  signerAddress: string
): Promise<string> {
  const typedData = challengeToTypedData(challenge, verifyingContract);

  return signTypedData(wagmiConfig, {
    account: signerAddress as `0x${string}`,
    domain: {
      ...typedData.domain,
      verifyingContract: verifyingContract as `0x${string}`,
    },
    types: { UnlockChallenge: [...UNLOCK_CHALLENGE_TYPES.UnlockChallenge] },
    primaryType: "UnlockChallenge",
    message: {
      propertyId: BigInt(challenge.propertyId),
      lockId: typedData.message.lockId as `0x${string}`,
      nonce: typedData.message.nonce as `0x${string}`,
      timestamp: BigInt(challenge.timestamp),
      action: challenge.action,
    },
  });
}

async function signWithEthers(
  challenge: SmartlockChallenge,
  verifyingContract: string
): Promise<{ signature: string; signerAddress: string }> {
  const signer = await getSigner();
  if (!signer) {
    throw new Error("No signer available. Connect MetaMask.");
  }

  const typedData = challengeToTypedData(challenge, verifyingContract);
  const signature = await signer.signTypedData(
    typedData.domain,
    { UnlockChallenge: [...UNLOCK_CHALLENGE_TYPES.UnlockChallenge] },
    typedData.message
  );
  const signerAddress = await signer.getAddress();

  return { signature, signerAddress };
}

export async function signUnlockChallenge(challenge: SmartlockChallenge): Promise<SmartlockResponse> {
  const verifyingContract = CONTRACT_ADDRESSES.propertyNft;
  if (!verifyingContract) {
    throw new Error("Property NFT contract address is not configured.");
  }

  const account = getAccount(wagmiConfig);
  let signature: string;
  let signerAddress: string;

  if (account.isConnected && account.address) {
    signature = await signWithWagmi(challenge, verifyingContract, account.address);
    signerAddress = account.address;
  } else {
    const ethersResult = await signWithEthers(challenge, verifyingContract);
    signature = ethersResult.signature;
    signerAddress = ethersResult.signerAddress;
  }

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
