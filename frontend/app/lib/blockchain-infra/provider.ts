import { getConnection, getWalletClient } from "@wagmi/core";
import type { Address } from "viem";
import { ethers } from "ethers";
import type { WalletClient } from "viem";
import { isMetaMaskInAppBrowser, isMobileBrowser, wagmiConfig } from "./wagmi-config";

const SEPOLIA_RPC = "https://sepolia.drpc.org";

let publicProvider: ethers.JsonRpcProvider | null = null;

export function getPublicProvider(): ethers.JsonRpcProvider {
  if (!publicProvider) {
    publicProvider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  }
  return publicProvider;
}

function walletClientToSigner(walletClient: WalletClient): ethers.JsonRpcSigner {
  const { account, chain, transport } = walletClient;
  if (!account) {
    throw new Error("Wallet client has no active account.");
  }

  const network = chain
    ? {
        chainId: chain.id,
        name: chain.name,
        ensAddress: chain.contracts?.ensRegistry?.address,
      }
    : undefined;

  const provider = new ethers.BrowserProvider(transport, network);
  return new ethers.JsonRpcSigner(provider, account.address);
}

export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  const connection = getConnection(wagmiConfig);
  if (connection.isConnected && connection.address) {
    try {
      const walletClient = await getWalletClient(wagmiConfig, {
        account: connection.address as Address,
      });
      if (walletClient) {
        return walletClientToSigner(walletClient);
      }
    } catch (error) {
      console.error("Failed to get wagmi wallet client:", error);
    }
  }

  const useInjectedFallback =
    isMetaMaskInAppBrowser() || (!isMobileBrowser() && typeof window !== "undefined");

  if (useInjectedFallback && typeof window !== "undefined" && (window as Window & { ethereum?: unknown }).ethereum) {
    try {
      const provider = new ethers.BrowserProvider(
        (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
      );
      return await provider.getSigner();
    } catch (error) {
      console.error("Failed to get injected signer:", error);
    }
  }

  return null;
}

/** @deprecated Prefer getPublicProvider for reads or getSigner for writes. */
export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && (window as Window & { ethereum?: unknown }).ethereum) {
    return new ethers.BrowserProvider(
      (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
    );
  }
  return null;
}
