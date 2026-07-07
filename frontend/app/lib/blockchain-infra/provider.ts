import { ethers } from "ethers";

export function getBrowserProvider(): ethers.BrowserProvider | null {
  if (typeof window !== "undefined" && (window as any).ethereum) {
    return new ethers.BrowserProvider((window as any).ethereum);
  }
  return null;
}

export function getReadProvider(): ethers.Provider {
  // Always use the configured RPC URL for read-only operations.
  // This guarantees we read from the correct network (e.g. Sepolia) 
  // even if the user has MetaMask installed but connected to the wrong network.
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

export async function fetchEventsInChunks(
  contract: ethers.Contract,
  filter: ethers.DeferredTopicFilter | ethers.ContractEventName,
  startBlock: number,
  chunkSize: number = 9000
): Promise<Array<any>> {
  const provider = contract.runner?.provider || getReadProvider();
  const currentBlock = await provider.getBlockNumber();
  let logs: any[] = [];
  
  for (let i = startBlock; i <= currentBlock; i += chunkSize) {
    const toBlock = Math.min(i + chunkSize - 1, currentBlock);
    try {
      const chunkLogs = await contract.queryFilter(filter, i, toBlock);
      logs = logs.concat(chunkLogs);
    } catch (e) {
      console.warn(`Error fetching events from block ${i} to ${toBlock}:`, e);
      // Fallback: try smaller chunk if it still fails
      const smallerChunkSize = Math.floor(chunkSize / 2);
      if (smallerChunkSize > 1000) {
         const smallerLogs = await fetchEventsInChunks(contract, filter, i, smallerChunkSize);
         logs = logs.concat(smallerLogs);
         i += chunkSize; // Skip to next main chunk since we handled this one
         continue;
      }
    }
  }
  return logs;
}
