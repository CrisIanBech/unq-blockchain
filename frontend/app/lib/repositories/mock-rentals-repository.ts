import { ethers } from "ethers";
import { IRentalsRepository } from "./rentals-repository";

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

export interface MockEvent {
  periodIndex: number;
  amount: bigint;
  lateFee: bigint;
  txHash: string;
  blockNumber: number;
  agreementAddress: string;
}

export interface MockContractState {
  baseRent: bigint;
  lateFeeBps: number;
  paymentPeriod: number;
  duration: number;
  startTime: number;
  rentPaidUntil: number;
  propertyId: bigint;
  tenant: string;
}

// Global in-memory state
const mockEvents: MockEvent[] = [];
const mockContracts: Record<string, MockContractState> = {};

export class MockRentalsRepository implements IRentalsRepository {
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
  }): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    const agreementAddress = "0xMockRental" + fakeTx().slice(0, 10);
    
    const startTime = Math.floor(Date.now() / 1000) - 2 * 30 * 86400; // Let's mock it starts 2 months ago

    mockContracts[agreementAddress] = {
      baseRent: params.baseRent,
      lateFeeBps: params.lateFeeBps,
      paymentPeriod: 30 * 86400, // Hardcoded for mock simplicity
      duration: params.duration,
      startTime: startTime,
      rentPaidUntil: startTime + 30 * 86400, // 1 month paid
      propertyId: params.propertyId,
      tenant: params.tenant,
    };

    return {
      hash: fakeTx(),
      contractAddress: agreementAddress
    };
  }

  async approveRental(params: any): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    return { hash: fakeTx() };
  }

  async payRent(agreementAddress: string, rentAmount: bigint): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    
    // Auto-seed if not exists for demo purposes
    if (!mockContracts[agreementAddress]) {
        MockRentalsRepository.seedMockData(agreementAddress, rentAmount);
    }

    const contract = mockContracts[agreementAddress];
    const periodsElapsed = Math.floor((contract.rentPaidUntil - contract.startTime) / contract.paymentPeriod);
    
    // Simplistic late fee calculation for mock (always late for demo)
    const isLate = true;
    const lateFee = isLate ? (contract.baseRent * BigInt(contract.lateFeeBps)) / 10000n : 0n;

    const txHash = fakeTx();

    mockEvents.push({
      agreementAddress,
      periodIndex: periodsElapsed,
      amount: contract.baseRent,
      lateFee: lateFee,
      txHash,
      blockNumber: Math.floor(Math.random() * 1000000)
    });

    contract.rentPaidUntil += contract.paymentPeriod;

    return { hash: txHash };
  }

  async withdrawRent(agreementAddress: string): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    return { hash: fakeTx() };
  }

  async cancelRental(agreementAddress: string): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    return { hash: fakeTx() };
  }

  async checkRentalExpiration(agreementAddress: string): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    return { hash: fakeTx() };
  }

  async getRentAmountToPay(agreementAddress: string): Promise<{ currentRent: bigint, lateFee: bigint, totalAmount: bigint }> {
    await new Promise((res) => setTimeout(res, 500));
    
    if (!mockContracts[agreementAddress]) {
      return { currentRent: 0n, lateFee: 0n, totalAmount: 0n };
    }

    const contract = mockContracts[agreementAddress];
    
    const isLate = true; // simulated late status
    const lateFee = isLate ? (contract.baseRent * BigInt(contract.lateFeeBps)) / 10000n : 0n;

    return {
      currentRent: contract.baseRent,
      lateFee,
      totalAmount: contract.baseRent + lateFee
    };
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
  }> {
    await new Promise((res) => setTimeout(res, 500));
    const contract = mockContracts[agreementAddress];
    const startTime = contract?.startTime ?? Math.floor(Date.now() / 1000) - 30 * 86400;
    const paymentPeriod = contract?.paymentPeriod ?? 30 * 86400;

    return {
      propertyId: contract?.propertyId ?? 1n,
      tenant: contract?.tenant ?? "0xMockTenant",
      landlord: "0xMockLandlord",
      baseRent: contract?.baseRent ?? 500000000n,
      rentPaidUntil: BigInt(contract?.rentPaidUntil ?? startTime + paymentPeriod),
      status: 2,
      startTime: BigInt(startTime),
      paymentPeriod: BigInt(paymentPeriod),
      securityDeposit: 0n,
      inflationBps: 0n,
      lateFeeBps: BigInt(contract?.lateFeeBps ?? 1000),
      gracePeriod: 5n * 86400n,
      duration: BigInt(contract?.duration ?? 12 * 30 * 86400),
      deadline: BigInt(startTime + 30 * 86400),
      landlordApproved: true,
      tenantApproved: true,
      landlordCancelled: false,
      tenantCancelled: false,
      inflationAdjustmentInterval: 0n,
    };
  }

  async getPaymentHistory(agreementAddress: string): Promise<Array<{
    periodIndex: number;
    amount: bigint;
    lateFee: bigint;
    txHash: string;
    timestamp: number;
  }>> {
    await new Promise((res) => setTimeout(res, 500));
    return mockEvents.filter((e) => e.agreementAddress === agreementAddress).map((e) => ({
      periodIndex: e.periodIndex,
      amount: e.amount,
      lateFee: e.lateFee,
      txHash: e.txHash,
      timestamp: e.blockNumber,
    }));
  }

  async getRentalAgreementForProperty(propertyId: number): Promise<string | null> {
    await new Promise((res) => setTimeout(res, 200));
    const entry = Object.entries(mockContracts).find(([_, c]) => Number(c.propertyId) === propertyId);
    if (entry) return entry[0];
    if (propertyId === 1) return "0xMockAgreement1";
    if (propertyId === 2) return "0xMockAgreement2";
    return null;
  }

  async getWithdrawableRent(agreementAddress: string): Promise<bigint> {
    await new Promise((res) => setTimeout(res, 200));
    return ethers.parseUnits("720", 6);
  }

  // Helper to seed some initial state for pre-existing rentals from mock-data
  static seedMockData(agreementAddress: string, baseRent: bigint) {
    if (mockContracts[agreementAddress]) return;
    
    const startTime = Math.floor(Date.now() / 1000) - 2 * 30 * 86400; // 2 periods ago
    mockContracts[agreementAddress] = {
      baseRent,
      lateFeeBps: 1000,
      paymentPeriod: 30 * 86400,
      duration: 12 * 30 * 86400,
      startTime: startTime,
      rentPaidUntil: startTime + 1 * 30 * 86400, // 1 period paid
      propertyId: 1n,
      tenant: "0xMockTenant"
    };
    
    // Seed one previous payment
    mockEvents.push({
      agreementAddress,
      periodIndex: 0,
      amount: baseRent,
      lateFee: 0n,
      txHash: fakeTx(),
      blockNumber: 123456
    });
  }
}
