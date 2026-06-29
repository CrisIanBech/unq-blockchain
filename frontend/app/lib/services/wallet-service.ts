import { ethers } from "ethers";
import { WalletRepository } from "../repositories/wallet-repository";
import { translateError } from "../errors/translator";

export class WalletService {
  static async connect(): Promise<string | null> {
    try {
      return await WalletRepository.connect();
    } catch (error) {
      throw translateError(error);
    }
  }

  static async getCurrentAccount(): Promise<string | null> {
    try {
      return await WalletRepository.getCurrentAccount();
    } catch (error) {
      throw translateError(error);
    }
  }

  static async getChainId(): Promise<number | null> {
    try {
      return await WalletRepository.getChainId();
    } catch (error) {
      throw translateError(error);
    }
  }

  static async switchToSepolia(): Promise<boolean> {
    try {
      return await WalletRepository.switchToSepolia();
    } catch (error) {
      throw translateError(error);
    }
  }

  static async getUSDCBalance(accountAddress: string): Promise<number> {
    try {
      const rawBalance = await WalletRepository.getUSDCBalance(accountAddress);
      return Number(ethers.formatUnits(rawBalance, 6));
    } catch (error) {
      throw translateError(error);
    }
  }
}
