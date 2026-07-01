import { ethers } from "ethers";
import {
  getSigner,
  getRentalAgreementFactory,
  getRentalAgreement,
  getMockUSDC,
  getPropertyNFT,
  CONTRACT_ADDRESSES
} from "../blockchain-infra";

export interface IRentalsRepository {
  createRental(params: any): Promise<ethers.TransactionReceipt>;
  approveRental(params: any): Promise<ethers.TransactionReceipt>;
  payRent(agreementAddress: string, rentAmount: bigint): Promise<ethers.TransactionReceipt>;
  withdrawRent(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  cancelRental(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  checkRentalExpiration(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  getRentAmountToPay(agreementAddress: string): Promise<{ currentRent: bigint, lateFee: bigint, totalAmount: bigint }>;
  getRentalDetails(agreementAddress: string): Promise<{
    propertyId: bigint;
    tenant: string;
    landlord: string;
    baseRent: bigint;
    rentPaidUntil: bigint;
    status: number;
    startTime: bigint;
    paymentPeriod: bigint;
  }>;
  getPaymentHistory(agreementAddress: string): Promise<Array<{
    periodIndex: number;
    amount: bigint;
    lateFee: bigint;
    txHash: string;
    blockNumber: number;
  }>>;
  getRentalAgreementForProperty(propertyId: number): Promise<string | null>;
  getWithdrawableRent(agreementAddress: string): Promise<bigint>;
}

export class RentalsRepository implements IRentalsRepository {
  async createRental(params: {
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
    const propertyNFTAddress = CONTRACT_ADDRESSES.propertyNft;
    const usdcTokenAddress = CONTRACT_ADDRESSES.usdc;
    const nftContract = getPropertyNFT(signer);
    const rentalNFTAddress = await nftContract.rentalNFT();

    const tx = await factory.createRentalAgreement(
      propertyNFTAddress,
      params.propertyId,
      params.tenant,
      usdcTokenAddress,
      rentalNFTAddress,
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

  async approveRental(params: {
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

  async payRent(agreementAddress: string, rentAmount: bigint): Promise<ethers.TransactionReceipt> {
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

  async withdrawRent(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.withdrawRent();
    return await tx.wait();
  }

  async cancelRental(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.cancelAgreement();
    return await tx.wait();
  }

  async checkRentalExpiration(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.checkExpiration();
    return await tx.wait();
  }

  async getRentAmountToPay(agreementAddress: string): Promise<{ currentRent: bigint, lateFee: bigint, totalAmount: bigint }> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const [currentRent, lateFee, totalAmount] = await agreement.getRentAmountToPay();
    return { currentRent, lateFee, totalAmount };
  }

  async getRentalDetails(agreementAddress: string): Promise<{
    propertyId: bigint;
    tenant: string;
    landlord: string;
    baseRent: bigint;
    rentPaidUntil: bigint;
    status: number;
    startTime: bigint;
    paymentPeriod: bigint;
  }> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const [propertyId, tenant, landlord, baseRent, rentPaidUntil, status, startTime, paymentPeriod] = await Promise.all([
      agreement.propertyId(),
      agreement.tenant(),
      agreement.landlord(),
      agreement.baseRent(),
      agreement.rentPaidUntil(),
      agreement.status(),
      agreement.startTime(),
      agreement.paymentPeriod()
    ]);

    return { 
      propertyId, 
      tenant, 
      landlord, 
      baseRent, 
      rentPaidUntil, 
      status: Number(status),
      startTime,
      paymentPeriod
    };
  }

  async getPaymentHistory(agreementAddress: string): Promise<Array<{
    periodIndex: number;
    amount: bigint;
    lateFee: bigint;
    txHash: string;
    blockNumber: number;
  }>> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    
    // Create filter for the RentPaid event
    const filter = agreement.filters.RentPaid();
    
    // Query logs from block 0 to latest
    const logs = await agreement.queryFilter(filter, 0, "latest");
    
    return logs.map((log: any) => ({
      periodIndex: Number(log.args[0]),
      amount: log.args[1],
      lateFee: log.args[2],
      txHash: log.transactionHash,
      blockNumber: log.blockNumber
    }));
  }

  async getRentalAgreementForProperty(propertyId: number): Promise<string | null> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const factory = getRentalAgreementFactory(signer);
    const filter = factory.filters.RentalAgreementCreated(null, BigInt(propertyId));
    const events = await factory.queryFilter(filter, 0, "latest");
    
    if (events.length === 0) return null;
    
    const latestEvent = events[events.length - 1];
    if ("args" in latestEvent && latestEvent.args) {
      return latestEvent.args[0] as string;
    }
    return null;
  }

  async getWithdrawableRent(agreementAddress: string): Promise<bigint> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const usdc = getMockUSDC(signer);
    
    const rawBalance = await usdc.balanceOf(agreementAddress);
    const rawDepositStatus = await agreement.depositStatus();
    const rawSecurityDeposit = await agreement.securityDeposit();

    const balance = BigInt(rawBalance);
    const depositStatus = Number(rawDepositStatus);
    const securityDeposit = BigInt(rawSecurityDeposit);
    
    // DepositStatus.Locked is 1
    const lockedAmount = (depositStatus === 1) ? securityDeposit : 0n;
    if (balance <= lockedAmount) return 0n;
    return balance - lockedAmount;
  }
}
