import { ethers } from "ethers";

export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return null;
}

export function getReadProvider(): ethers.Provider {
  const browserProvider = getBrowserProvider();
  if (browserProvider) return browserProvider;
  
  const rpcUrl = import.meta.env.VITE_RPC_URL || "http://localhost:8545";
  return new ethers.JsonRpcProvider(rpcUrl);
}

export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  const provider = getBrowserProvider();
  if (!provider) return null;
  try {
    return await provider.getSigner();
  } catch (error) {
    console.error("Failed to get signer:", error);
    return null;
  }
}
