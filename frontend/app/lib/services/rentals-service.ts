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
  constructor(private repo: IRentalsRepository) { }
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
    paymentPeriod: number;
    inflationAdjustmentInterval: number;
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

      let agreementAddress = "";
      for (const log of receipt.logs) {
        const eventTopic = ethers.id("RentalAgreementCreated(address,uint256,address,uint256,uint256,uint256)");
        if (log.topics[0] === eventTopic) {
          const coder = ethers.AbiCoder.defaultAbiCoder();
          const decoded = coder.decode(["address"], log.topics[1]);
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

  async releaseDeposit(agreementAddress: string): Promise<TransactionResult> {
    try {
      const receipt = await this.repo.releaseDeposit(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async claimDeposit(agreementAddress: string, amount: number, reason: string): Promise<TransactionResult> {
    try {
      const amountRaw = ethers.parseUnits(amount.toString(), 6);
      const receipt = await this.repo.claimDeposit(agreementAddress, amountRaw, reason);
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
        status: details.status,
        startTime: Number(details.startTime),
        paymentPeriod: Number(details.paymentPeriod),
        securityDeposit: Number(ethers.formatUnits(details.securityDeposit, 6)),
        inflationBps: Number(details.inflationBps),
        lateFeeBps: Number(details.lateFeeBps),
        gracePeriod: Number(details.gracePeriod),
        duration: Number(details.duration),
        deadline: Number(details.deadline),
        landlordApproved: details.landlordApproved,
        tenantApproved: details.tenantApproved,
        landlordCancelled: details.landlordCancelled,
        tenantCancelled: details.tenantCancelled,
        inflationAdjustmentInterval: Number(details.inflationAdjustmentInterval),
        depositStatus: details.depositStatus
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
        timestamp: e.timestamp
      }));
    } catch (error) {
      throw translateError(error);
    }
  }

  async getRentalAgreementForProperty(propertyId: number): Promise<string | null> {
    try {
      return await this.repo.getRentalAgreementForProperty(propertyId);
    } catch (error) {
      throw translateError(error);
    }
  }

  async getWithdrawableRent(agreementAddress: string): Promise<number> {
    try {
      const balance = await this.repo.getWithdrawableRent(agreementAddress);
      return Number(ethers.formatUnits(balance, 6));
    } catch (error) {
      throw translateError(error);
    }
  }
}
