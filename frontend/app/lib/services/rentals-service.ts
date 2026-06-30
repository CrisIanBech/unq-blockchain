import { ethers } from "ethers";
import { RentalsRepository } from "../repositories/rentals-repository";
import { translateError } from "../errors/translator";

export interface RentalCreationResult {
  agreementAddress: string;
  txHash: string;
}

export interface TransactionResult {
  txHash: string;
}

export class RentalsService {
  /**
   * Deploys a new RentalAgreement and extracts the address from the receipt log.
   */
  static async createRental(params: {
    propertyId: bigint;
    tenant: string;
    baseRent: number; // in normal USDC unit
    securityDeposit: number; // in normal USDC unit
    inflationBps: number;
    lateFeeBps: number;
    gracePeriod: number;
    duration: number;
    deadline: number;
  }): Promise<RentalCreationResult> {
    try {
      const baseRentRaw = ethers.parseUnits(params.baseRent.toString(), 6);
      const depositRaw = ethers.parseUnits(params.securityDeposit.toString(), 6);

      const receipt = await RentalsRepository.createRental({
        ...params,
        baseRent: baseRentRaw,
        securityDeposit: depositRaw
      });

      // Parse the dynamically deployed RentalAgreement address from logs
      // A simple check is to find the log emitted by factory
      // (Alternative fallback: search-store logs check)
      let agreementAddress = "";
      for (const log of receipt.logs) {
        // Factory contract emits RentalAgreementCreated event
        // The first topic is Keccak-256 hash of "RentalAgreementCreated(uint256,address,address)"
        const eventTopic = ethers.id("RentalAgreementCreated(uint256,address,address)");
        if (log.topics[0] === eventTopic) {
          // The event signature has (uint256 propertyId, address tenant, address agreementAddress)
          // The third parameter (address agreementAddress) is indexed, so it's topics[3] or encoded in data
          // In standard solidity, indexed parameters are stored in topics.
          // topics[0] = signature
          // topics[1] = propertyId (indexed)
          // topics[2] = tenant (indexed)
          // data = agreementAddress (non-indexed)
          // Let's decode data using Ethers AbiCoder:
          const coder = ethers.AbiCoder.defaultAbiCoder();
          const decoded = coder.decode(["address"], log.data);
          agreementAddress = decoded[0];
          break;
        }
      }

      if (!agreementAddress) {
        throw new Error("RentalAgreementCreated event not detected in blockchain logs.");
      }

      return {
        agreementAddress,
        txHash: receipt.hash
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Approves a rental agreement on-chain (including tenant USDC approvals).
   */
  static async approveAgreement(params: {
    agreementAddress: string;
    isTenant: boolean;
    depositAmount?: number;
  }): Promise<TransactionResult> {
    try {
      const depositRaw = params.depositAmount !== undefined 
        ? ethers.parseUnits(params.depositAmount.toString(), 6) 
        : undefined;

      const receipt = await RentalsRepository.approveRental({
        agreementAddress: params.agreementAddress,
        isTenant: params.isTenant,
        depositAmount: depositRaw
      });

      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Pays rent for a specific agreement on-chain.
   */
  static async payRent(agreementAddress: string, rentAmount: number): Promise<TransactionResult> {
    try {
      const rentRaw = ethers.parseUnits(rentAmount.toString(), 6);
      const receipt = await RentalsRepository.payRent(agreementAddress, rentRaw);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Withdraws collected rent from escrow.
   */
  static async withdrawRent(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await RentalsRepository.withdrawRent(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Cancels a rental agreement.
   */
  static async cancelAgreement(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await RentalsRepository.cancelRental(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  /**
   * Triggers expiration checks.
   */
  static async checkExpiration(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await RentalsRepository.checkRentalExpiration(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }
}
