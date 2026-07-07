import { ethers } from "ethers";
import {
  getSigner,
  getBrowserProvider,
  getRentalAgreementFactory,
  getRentalAgreement,
  getMockUSDC,
  getPropertyNFT,
  CONTRACT_ADDRESSES,
  fetchEventsInChunks
} from "../blockchain-infra";

export interface IRentalsRepository {
  createRental(params: any): Promise<ethers.TransactionReceipt>;
  approveRental(params: any): Promise<ethers.TransactionReceipt>;
  payRent(agreementAddress: string, rentAmount: bigint): Promise<ethers.TransactionReceipt>;
  withdrawRent(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  cancelRental(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  checkRentalExpiration(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  releaseDeposit(agreementAddress: string): Promise<ethers.TransactionReceipt>;
  claimDeposit(agreementAddress: string, amount: bigint, reason: string): Promise<ethers.TransactionReceipt>;
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
    securityDeposit: bigint;
    inflationBps: bigint;
    lateFeeBps: bigint;
    gracePeriod: bigint;
    duration: bigint;
    deadline: bigint;
    landlordApproved: boolean;
    tenantApproved: boolean;
    landlordCancelled: boolean;
    tenantCancelled: boolean;
    inflationAdjustmentInterval: bigint;
    depositStatus: number;
  }>;
  getPaymentHistory(agreementAddress: string): Promise<Array<{
    periodIndex: number;
    amount: bigint;
    lateFee: bigint;
    txHash: string;
    timestamp: number;
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
    paymentPeriod: number;
    inflationAdjustmentInterval: number;
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
      params.paymentPeriod,
      params.inflationAdjustmentInterval,
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
    } else {
      const agreement = getRentalAgreement(params.agreementAddress, signer);
      const propertyId = await agreement.propertyId();
      const propertyNft = getPropertyNFT(signer);
      const approveTx = await propertyNft.approve(params.agreementAddress, propertyId);
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

  async releaseDeposit(agreementAddress: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.releaseDeposit();
    return await tx.wait();
  }

  async claimDeposit(agreementAddress: string, amount: bigint, reason: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.claimDeposit(amount, reason);
    return await tx.wait();
  }

  async getRentAmountToPay(agreementAddress: string): Promise<{ currentRent: bigint, lateFee: bigint, totalAmount: bigint }> {
    const runner = getBrowserProvider();
    if (!runner) throw new Error("No provider available.");

    const agreement = getRentalAgreement(agreementAddress, runner);
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
    securityDeposit: bigint;
    inflationBps: bigint;
    lateFeeBps: bigint;
    gracePeriod: bigint;
    duration: bigint;
    deadline: bigint;
    landlordApproved: boolean;
    tenantApproved: boolean;
    landlordCancelled: boolean;
    tenantCancelled: boolean;
    inflationAdjustmentInterval: bigint;
    depositStatus: number;
  }> {
    const runner = getBrowserProvider();
    if (!runner) throw new Error("No provider available.");

    const agreement = getRentalAgreement(agreementAddress, runner);
    const details = await agreement.getAgreementDetails();
    const inflationAdjustmentInterval = await agreement.inflationAdjustmentInterval();
    const depositStatus = await agreement.depositStatus();

    return {
      propertyId: details.propertyId,
      tenant: details.tenant,
      landlord: details.landlord,
      baseRent: details.baseRent,
      rentPaidUntil: details.rentPaidUntil,
      status: Number(details.status),
      startTime: details.startTime,
      paymentPeriod: details.paymentPeriod,
      securityDeposit: details.securityDeposit,
      inflationBps: details.inflationBps,
      lateFeeBps: details.lateFeeBps,
      gracePeriod: details.gracePeriod,
      duration: details.duration,
      deadline: details.deadline,
      landlordApproved: details.landlordApproved,
      tenantApproved: details.tenantApproved,
      landlordCancelled: details.landlordCancelled,
      tenantCancelled: details.tenantCancelled,
      inflationAdjustmentInterval,
      depositStatus: Number(depositStatus),
    };
  }

  async getPaymentHistory(agreementAddress: string): Promise<Array<{
    periodIndex: number;
    amount: bigint;
    lateFee: bigint;
    txHash: string;
    timestamp: number;
  }>> {
    const runner = getBrowserProvider();
    if (!runner) throw new Error("No provider available.");

    const agreement = getRentalAgreement(agreementAddress, runner);

    const filter = agreement.filters.RentPaid();

    const startBlock = Number(import.meta.env.VITE_DEPLOY_BLOCK) || 0;
    const logs = await fetchEventsInChunks(agreement, filter, startBlock);

    const logsWithTime = await Promise.all(logs.map(async (log: any) => {
      const block = await log.getBlock();
      return {
        periodIndex: Number(log.args[0]),
        amount: log.args[1],
        lateFee: log.args[2],
        txHash: log.transactionHash,
        timestamp: block.timestamp
      };
    }));
    return logsWithTime;
  }

  async getRentalAgreementForProperty(propertyId: number): Promise<string | null> {
    const runner = getBrowserProvider();
    if (!runner) throw new Error("No provider available.");

    const factory = getRentalAgreementFactory(runner);
    const filter = factory.filters.RentalAgreementCreated(null, BigInt(propertyId));
    const startBlock = Number(import.meta.env.VITE_DEPLOY_BLOCK) || 0;
    const events = await fetchEventsInChunks(factory, filter, startBlock);

    if (events.length === 0) return null;

    const latestEvent = events[events.length - 1];
    if ("args" in latestEvent && latestEvent.args) {
      return latestEvent.args[0] as string;
    }
    return null;
  }

  async getWithdrawableRent(agreementAddress: string): Promise<bigint> {
    const runner = getBrowserProvider();
    if (!runner) throw new Error("No provider available.");

    const agreement = getRentalAgreement(agreementAddress, runner);
    const usdc = getMockUSDC(runner);

    const rawBalance = await usdc.balanceOf(agreementAddress);
    const rawDepositStatus = await agreement.depositStatus();
    const rawSecurityDeposit = await agreement.securityDeposit();

    const balance = BigInt(rawBalance);
    const depositStatus = Number(rawDepositStatus);
    const securityDeposit = BigInt(rawSecurityDeposit);

    const lockedAmount = (depositStatus === 1) ? securityDeposit : 0n;
    if (balance <= lockedAmount) return 0n;
    return balance - lockedAmount;
  }
}
