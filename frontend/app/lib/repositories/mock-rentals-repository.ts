import { ethers } from "ethers";

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
}

import { IRentalsRepository } from "./rentals-repository";

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
  }> {
    await new Promise((res) => setTimeout(res, 500));
    const contract = mockContracts[agreementAddress];
    if (!contract) {
       // Return dummy data if not found in mock
       return {
         propertyId: 1n,
         tenant: "0xMockTenant",
         landlord: "0xMockLandlord",
         baseRent: 500000000n, // 500 USDC
         rentPaidUntil: BigInt(Math.floor(Date.now() / 1000)),
         status: 2 // Active
       };
    }
    return {
      propertyId: contract.propertyId,
      tenant: contract.tenant,
      landlord: "0xMockLandlord",
      baseRent: contract.baseRent,
      rentPaidUntil: BigInt(contract.rentPaidUntil),
      status: 2 // Active
    };
  }

  async getPaymentHistory(agreementAddress: string): Promise<Array<{
    periodIndex: number;
    amount: bigint;
    lateFee: bigint;
    txHash: string;
    blockNumber: number;
  }>> {
    await new Promise((res) => setTimeout(res, 500));
    return mockEvents.filter(e => e.agreementAddress === agreementAddress).map(e => ({
      periodIndex: e.periodIndex,
      amount: e.amount,
      lateFee: e.lateFee,
      txHash: e.txHash,
      blockNumber: e.blockNumber
    }));
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
