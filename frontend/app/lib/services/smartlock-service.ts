import { translateError } from "../errors/translator";
import { readChallengeFromNfc, canUseWebNfc, isWebNfcSupported } from "../blockchain-infra/nfc";
import { createChallenge, type SmartlockChallenge } from "@shared/smartlock-protocol/index";
import { SmartlockRepository, type AuthorizationResult, type SmartlockRole } from "../repositories/smartlock-repository";
import { WalletService } from "./wallet-service";
import { ensureNetwork } from "../blockchain-infra/wallet";
import { isSmartlockMockMode } from "../smartlock/config";
export interface UnlockResult {
  authorized: boolean;
  role: AuthorizationResult["role"];
  signerAddress: string;
  challenge: SmartlockChallenge;
  usedDemoFallback?: boolean;
}

export class SmartlockService {
  static isNfcAvailable(): boolean {
    return canUseWebNfc();
  }

  /** Browser has NDEFReader but NFC may still be blocked (HTTP, permissions). */
  static isNfcApiPresent(): boolean {
    return isWebNfcSupported();
  }

  static async ensureWalletConnected(): Promise<string> {
    let account = await WalletService.getCurrentAccount();
    if (!account) {
      account = await WalletService.connect();
    }
    if (!account) {
      throw new Error("Connect MetaMask to unlock the smartlock.");
    }

    if (!isSmartlockMockMode()) {
      const switched = await ensureNetwork();
      if (!switched) {
        throw new Error("Switch MetaMask to the configured network to continue.");
      }
    }

    return account;
  }

  /**
   * Full unlock flow: read NFC challenge → sign with MetaMask → verify on-chain.
   */
  static async unlockFromNfc(params: {
    propertyId: bigint;
    agreementAddress?: string;
    /** Demo fallback when NFC hardware is unavailable */
    demoChallenge?: SmartlockChallenge;
    /** In mock mode, UI context determines landlord vs tenant */
    expectedRole?: SmartlockRole;
  }): Promise<UnlockResult> {
    try {
      await this.ensureWalletConnected();

      let challenge: SmartlockChallenge;
      let usedDemoFallback = false;

      if (canUseWebNfc()) {
        try {
          challenge = await readChallengeFromNfc();
        } catch (nfcError) {
          if (!params.demoChallenge) throw nfcError;
          challenge = params.demoChallenge;
          usedDemoFallback = true;
        }
      } else if (params.demoChallenge) {
        challenge = params.demoChallenge;
        usedDemoFallback = true;
      } else {
        throw new Error(
          "Web NFC no disponible (usá HTTPS o localhost). En mock mode se usa un desafío demo automáticamente."
        );
      }

      if (BigInt(challenge.propertyId) !== params.propertyId) {
        throw new Error("NFC challenge is for a different property.");
      }

      const response = await SmartlockRepository.signChallenge(challenge);
      const auth = await SmartlockRepository.verifyAuthorization(
        challenge,
        response,
        params.agreementAddress,
        { expectedRole: params.expectedRole }
      );

      return {
        authorized: auth.role !== "unauthorized",
        role: auth.role,
        signerAddress: auth.signerAddress,
        challenge,
        usedDemoFallback,
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Sign a challenge received via URL (for Android app → MetaMask browser flow).
   */
  static async signChallengeFromUrl(
    challenge: SmartlockChallenge,
    agreementAddress?: string,
    expectedRole?: SmartlockRole
  ): Promise<UnlockResult> {
    try {
      await this.ensureWalletConnected();

      const response = await SmartlockRepository.signChallenge(challenge);
      const auth = await SmartlockRepository.verifyAuthorization(
        challenge,
        response,
        agreementAddress,
        { expectedRole }
      );

      return {
        authorized: auth.role !== "unauthorized",
        role: auth.role,
        signerAddress: auth.signerAddress,
        challenge,
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  /** Generate a challenge (lock-side simulator for demos). */
  static createDemoChallenge(propertyId: bigint, lockId: string, chainId: number): SmartlockChallenge {
    return createChallenge(propertyId.toString(), lockId, chainId);
  }
}
