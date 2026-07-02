import { getBrowserProvider } from "./provider";

export async function getLatestBlockTimestamp(): Promise<number> {
  try {
    const provider = getBrowserProvider();
    if (provider) {
      const block = await provider.getBlock("latest");
      if (block) {
        return block.timestamp;
      }
    }
  } catch (error) {
    console.warn("Error fetching latest block timestamp, using local fallback:", error);
  }
  return Math.floor(Date.now() / 1000);
}
