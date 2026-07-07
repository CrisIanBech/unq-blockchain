import { ethers } from "ethers";
import { getPublicProvider, getPropertyNFT, getRentalAgreement } from "../blockchain-infra";
import { CONTRACT_ADDRESSES } from "../blockchain-infra/addresses";
import { verifyUnlockSignature, type SmartlockChallenge, type SmartlockResponse } from "../blockchain-infra/smartlock-signing";
import { isSmartlockMockMode } from "../smartlock/config";

export type SmartlockRole = "landlord" | "tenant" | "unauthorized";
export interface AuthorizationResult {
  role: SmartlockRole;
  signerAddress: string;
  propertyOwner: string;
  tenantAddress: string | null;
}

const ACTIVE_STATUS = 2;

export class SmartlockRepository {
  static async getPropertyOwner(propertyId: bigint): Promise<string> {
    const provider = getPublicProvider();
    const contract = getPropertyNFT(provider);
    return contract.ownerOf(propertyId);
  }

  static async getTenantAddress(agreementAddress: string): Promise<{ tenant: string; isActive: boolean }> {
    const provider = getPublicProvider();
    const agreement = getRentalAgreement(agreementAddress, provider);
    const [tenant, status] = await Promise.all([
      agreement.tenant() as Promise<string>,
      agreement.status() as Promise<number>,
    ]);

    return { tenant, isActive: Number(status) === ACTIVE_STATUS };
  }

  static async verifyAuthorization(
    challenge: SmartlockChallenge,
    response: SmartlockResponse,
    agreementAddress?: string,
    options?: { expectedRole?: SmartlockRole }
  ): Promise<AuthorizationResult> {
    const verifyingContract = CONTRACT_ADDRESSES.propertyNft;
    if (!verifyingContract) {
      throw new Error("Property NFT contract address is not configured.");
    }

    const recoveredSigner = verifyUnlockSignature(challenge, response, verifyingContract);

    if (isSmartlockMockMode()) {
      const role = options?.expectedRole ?? "landlord";
      return {
        role,
        signerAddress: recoveredSigner,
        propertyOwner: recoveredSigner,
        tenantAddress: role === "tenant" ? recoveredSigner : null,
      };
    }

    const propertyId = BigInt(challenge.propertyId);
    const propertyOwner = await this.getPropertyOwner(propertyId);
    let tenantAddress: string | null = null;
    let tenantIsActive = false;

    if (agreementAddress) {
      const tenantInfo = await this.getTenantAddress(agreementAddress);
      tenantAddress = tenantInfo.tenant;
      tenantIsActive = tenantInfo.isActive;
    }

    const signerLower = recoveredSigner.toLowerCase();
    const isLandlord = propertyOwner.toLowerCase() === signerLower;
    const isTenant = tenantAddress !== null && tenantAddress.toLowerCase() === signerLower && tenantIsActive;

    let role: SmartlockRole = "unauthorized";
    if (isLandlord) {
      role = "landlord";
    } else if (isTenant) {
      role = "tenant";
    }

    return {
      role,
      signerAddress: recoveredSigner,
      propertyOwner,
      tenantAddress,
    };
  }

  static async signChallenge(challenge: SmartlockChallenge): Promise<SmartlockResponse> {
    const { signUnlockChallenge } = await import("../blockchain-infra/smartlock-signing");
    return signUnlockChallenge(challenge);
  }

  static formatAddress(address: string): string {
    return ethers.getAddress(address);
  }
}
