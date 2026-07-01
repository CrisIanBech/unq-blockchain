import { ethers } from "ethers";
import {
  connectWallet,
  getCurrentAccount,
  getChainId,
  switchToSepolia,
  getPublicProvider,
  getMockUSDC
} from "../blockchain-infra";

export class WalletRepository {
  static async connect(): Promise<string | null> {
    return await connectWallet();
  }

  static async getCurrentAccount(): Promise<string | null> {
    return await getCurrentAccount();
  }

  static async getChainId(): Promise<number | null> {
    return await getChainId();
  }

  static async switchToSepolia(): Promise<boolean> {
    return await switchToSepolia();
  }

  static async getUSDCBalance(accountAddress: string): Promise<bigint> {
    const provider = getPublicProvider();
    try {
      const usdc = getMockUSDC(provider);
      return await usdc.balanceOf(accountAddress);
    } catch (error) {
      console.error("WalletRepository: Failed to fetch USDC balance", error);
      return 0n;
    }
  }
}
