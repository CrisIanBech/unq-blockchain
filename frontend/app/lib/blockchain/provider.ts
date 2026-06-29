import { ethers } from "ethers";

/**
 * Gets the BrowserProvider using window.ethereum.
 * Returns null if window.ethereum is not present.
 */
export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return null;
}

/**
 * Resolves the JsonRpcSigner from the browser provider.
 * Returns null if the provider is unavailable or requested account access is denied.
 */
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
