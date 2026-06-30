import { ethers } from "ethers";
import { IRentalsRepository } from "../repositories/rentals-repository";
import { translateError } from "../errors/translator";

export interface RentalCreationResult {
  agreementAddress: string;
  txHash: string;
}

export interface TransactionResult {
  txHash: string;
}

export class RentalsService {
  constructor(private repo: IRentalsRepository) {}
  /**
   * Deploys a new RentalAgreement and extracts the address from the receipt log.
   */
  async createRental(params: {
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
      
      const repoParams = {
        ...params,
        baseRent: baseRentRaw,
        securityDeposit: depositRaw
      };

      const receipt = await this.repo.createRental(repoParams);

      // If we are using mock repo, we can extract from contractAddress instead of logs
      if ((receipt as any).contractAddress) {
        return { agreementAddress: (receipt as any).contractAddress, txHash: receipt.hash };
      }

      let agreementAddress = "";
      for (const log of receipt.logs) {
        const eventTopic = ethers.id("RentalAgreementCreated(uint256,address,address)");
        if (log.topics[0] === eventTopic) {
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

  async approveAgreement(params: {
    agreementAddress: string;
    isTenant: boolean;
    depositAmount?: number;
  }): Promise<TransactionResult> {
    try {
      const depositRaw = params.depositAmount !== undefined 
        ? ethers.parseUnits(params.depositAmount.toString(), 6) 
        : undefined;

      const repoParams = { ...params, depositAmount: depositRaw };
      const receipt = await this.repo.approveRental(repoParams);

      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async payRent(agreementAddress: string, rentAmount: number): Promise<TransactionResult> {
    try {
      const rentRaw = ethers.parseUnits(rentAmount.toString(), 6);
      const receipt = await this.repo.payRent(agreementAddress, rentRaw);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async withdrawRent(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await this.repo.withdrawRent(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async cancelAgreement(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await this.repo.cancelRental(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async checkExpiration(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await this.repo.checkRentalExpiration(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getRentAmountToPay(agreementAddress: string) {
    try {
      const amounts = await this.repo.getRentAmountToPay(agreementAddress);
        
      return {
        currentRent: Number(ethers.formatUnits(amounts.currentRent, 6)),
        lateFee: Number(ethers.formatUnits(amounts.lateFee, 6)),
        totalAmount: Number(ethers.formatUnits(amounts.totalAmount, 6))
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getRentalDetails(agreementAddress: string) {
    try {
      const details = await this.repo.getRentalDetails(agreementAddress);
      return {
        propertyId: details.propertyId,
        tenant: details.tenant,
        landlord: details.landlord,
        baseRent: Number(ethers.formatUnits(details.baseRent, 6)),
        rentPaidUntil: Number(details.rentPaidUntil),
        status: details.status
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getPaymentHistory(agreementAddress: string) {
    try {
      const events = await this.repo.getPaymentHistory(agreementAddress);
        
      return events.map(e => ({
        periodIndex: e.periodIndex,
        amount: Number(ethers.formatUnits(e.amount, 6)),
        lateFee: Number(ethers.formatUnits(e.lateFee, 6)),
        txHash: e.txHash,
        blockNumber: e.blockNumber
      }));
    } catch (error) {
      throw translateError(error);
    }
  }
}
