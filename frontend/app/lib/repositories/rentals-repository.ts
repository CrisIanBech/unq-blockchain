import { ethers } from "ethers";
import {
  getSigner,
  getRentalAgreementFactory,
  getRentalAgreement,
  getMockUSDC
} from "../blockchain-infra";

export class RentalsRepository {
  static async createRental(params: {
    propertyId: bigint;
    tenant: string;
    baseRent: bigint;
    securityDeposit: bigint;
    inflationBps: number;
    lateFeeBps: number;
    gracePeriod: number;
    duration: number;
    deadline: number;
  }): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const factory = getRentalAgreementFactory(signer);
    const tx = await factory.createRentalAgreement(
      params.propertyId,
      params.tenant,
      params.baseRent,
      params.securityDeposit,
      params.inflationBps,
      params.lateFeeBps,
      params.gracePeriod,
      params.duration,
      params.deadline
    );
    return await tx.wait();
  }

  static async approveRental(params: {
    agreementAddress: string;
    isTenant: boolean;
    depositAmount?: bigint;
  }): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    if (params.isTenant) {
      if (params.depositAmount === undefined) {
        throw new Error("Deposit amount is required for tenant approval.");
      }
      const usdc = getMockUSDC(signer);
      // Step 1: Approve allowance
      const approveTx = await usdc.approve(params.agreementAddress, params.depositAmount);
      await approveTx.wait();
    }

    // Step 2: Approve agreement
    const agreement = getRentalAgreement(params.agreementAddress, signer);
    const tx = await agreement.approveAgreement();
    return await tx.wait();
  }

  static async payRent(agreementAddress: string, rentAmount: bigint): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    // Step 1: Approve rent USDC
    const usdc = getMockUSDC(signer);
    const approveTx = await usdc.approve(agreementAddress, rentAmount);
    await approveTx.wait();

    // Step 2: Call payRent
    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.payRent();
    return await tx.wait();
  }

  static async withdrawRent(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.withdrawRent();
    return await tx.wait();
  }

  static async cancelRental(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.cancelAgreement();
    return await tx.wait();
  }

  static async checkRentalExpiration(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.checkExpiration();
    return await tx.wait();
  }
}
