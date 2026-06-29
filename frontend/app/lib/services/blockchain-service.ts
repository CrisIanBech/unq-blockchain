import { ethers } from "ethers";
import {
  getBrowserProvider,
  getSigner,
  getPropertyNFT,
  getRentalAgreementFactory,
  getRentalAgreement,
  getMockUSDC,
  switchToSepolia,
  getChainId
} from "../blockchain";

export class BlockchainService {
  /**
   * Helper to ensure the wallet is connected to Sepolia network.
   */
  private static async ensureSepolia(): Promise<ethers.JsonRpcSigner> {
    const signer = await getSigner();
    if (!signer) {
      throw new Error("No wallet connected. Please connect MetaMask.");
    }
    const chainId = await getChainId();
    if (chainId !== 11155111) {
      const switched = await switchToSepolia();
      if (!switched) {
        throw new Error("Please switch your network to Sepolia.");
      }
      // Re-fetch signer after network switch
      const newSigner = await getSigner();
      if (!newSigner) throw new Error("Failed to resolve signer after switching network.");
      return newSigner;
    }
    return signer;
  }

  /**
   * Mints a new property NFT.
   * @param recipient The address that will own the minted PropertyNFT.
   * @param metadataURI The metadata URL (IPFS or HTTPS) for the property.
   * @returns The transaction receipt.
   */
  static async mintPropertyNFT(recipient: string, metadataURI: string): Promise<ethers.TransactionReceipt> {
    const signer = await this.ensureSepolia();
    const contract = getPropertyNFT(signer);
    const tx = await contract.mint(recipient, metadataURI);
    return await tx.wait();
  }

  /**
   * Deploys a new RentalAgreement contract using the factory.
   */
  static async createRentalAgreement(params: {
    propertyId: number;
    tenant: string;
    baseRent: number; // in normal USDC unit (e.g. 1000)
    securityDeposit: number; // in normal USDC unit (e.g. 2000)
    inflationBps: number;
    lateFeeBps: number;
    gracePeriod: number;
    duration: number;
    deadline: number;
  }): Promise<{ agreementAddress: string; txHash: string }> {
    const signer = await this.ensureSepolia();
    const factory = getRentalAgreementFactory(signer);

    // Convert values to USDC 6 decimals
    const rentRaw = ethers.parseUnits(params.baseRent.toString(), 6);
    const depositRaw = ethers.parseUnits(params.securityDeposit.toString(), 6);

    const tx = await factory.createRentalAgreement(
      params.propertyId,
      params.tenant,
      rentRaw,
      depositRaw,
      params.inflationBps,
      params.lateFeeBps,
      params.gracePeriod,
      params.duration,
      params.deadline
    );

    const receipt: ethers.TransactionReceipt = await tx.wait();

    // Look for the RentalAgreementCreated event in receipt logs
    // Factory ABI events helper
    const factoryInterface = factory.interface;
    let agreementAddress = "";
    
    for (const log of receipt.logs) {
      try {
        const parsedLog = factoryInterface.parseLog({
          topics: log.topics as string[],
          data: log.data
        });
        if (parsedLog && parsedLog.name === "RentalAgreementCreated") {
          agreementAddress = parsedLog.args.agreementAddress;
          break;
        }
      } catch (err) {
        // Log doesn't belong to this contract or cannot be parsed, ignore
      }
    }

    if (!agreementAddress) {
      throw new Error("RentalAgreementCreated event not found in transaction receipt.");
    }

    return { agreementAddress, txHash: receipt.hash };
  }

  /**
   * Approves a RentalAgreement contract.
   * If the caller is the tenant, it approves USDC allowance first.
   */
  static async approveRentalAgreement(params: {
    agreementAddress: string;
    isTenant: boolean;
    depositAmount?: number; // Needed if isTenant is true
  }): Promise<string> {
    const signer = await this.ensureSepolia();
    
    if (params.isTenant) {
      if (params.depositAmount === undefined) {
        throw new Error("Deposit amount is required for tenant approval.");
      }
      const usdc = getMockUSDC(signer);
      const depositRaw = ethers.parseUnits(params.depositAmount.toString(), 6);
      
      // Step 1: Approve USDC allowance
      const approveTx = await usdc.approve(params.agreementAddress, depositRaw);
      await approveTx.wait();
    }

    // Step 2: Call approveAgreement on RentalAgreement
    const agreement = getRentalAgreement(params.agreementAddress, signer);
    const tx = await agreement.approveAgreement();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Pays monthly rent for a given agreement contract.
   */
  static async payMonthlyRent(agreementAddress: string, rentAmount: number): Promise<string> {
    const signer = await this.ensureSepolia();
    const usdc = getMockUSDC(signer);
    const rentRaw = ethers.parseUnits(rentAmount.toString(), 6);

    // Step 1: Approve USDC allowance for the rent payment
    const approveTx = await usdc.approve(agreementAddress, rentRaw);
    await approveTx.wait();

    // Step 2: Pay rent
    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.payRent();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Withdraws accumulated rent funds from the rental contract escrow.
   */
  static async withdrawRent(agreementAddress: string): Promise<string> {
    const signer = await this.ensureSepolia();
    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.withdrawRent();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Cancels a rental agreement cooperatively.
   */
  static async cancelRentalAgreement(agreementAddress: string): Promise<string> {
    const signer = await this.ensureSepolia();
    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.cancelAgreement();
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Fetches the current USDC balance of a wallet address.
   */
  static async getUSDCBalance(accountAddress: string): Promise<number> {
    const provider = getBrowserProvider();
    if (!provider) return 0;
    try {
      const usdc = getMockUSDC(provider);
      const balanceRaw = await usdc.balanceOf(accountAddress);
      return Number(ethers.formatUnits(balanceRaw, 6));
    } catch (error) {
      console.error("Failed to fetch USDC balance:", error);
      return 0;
    }
  }

  /**
   * Triggers the expiration state transition check for a pending agreement.
   */
  static async checkAgreementExpiration(agreementAddress: string): Promise<string> {
    const signer = await this.ensureSepolia();
    const agreement = getRentalAgreement(agreementAddress, signer);
    const tx = await agreement.checkExpiration();
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
