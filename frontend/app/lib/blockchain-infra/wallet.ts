import { getBrowserProvider } from "./provider";

export async function connectWallet(): Promise<string | null> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No Ethereum provider found. Please install MetaMask.");
  }
  try {
    const accounts: string[] = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0] || null;
  } catch (error) {
    console.error("User denied account connection:", error);
    throw error;
  }
}

export async function getCurrentAccount(): Promise<string | null> {
  if (typeof window === "undefined" || !(window as any).ethereum) return null;
  try {
    const accounts: string[] = await (window as any).ethereum.request({
      method: "eth_accounts",
    });
    return accounts[0] || null;
  } catch (error) {
    console.error("Failed to query accounts:", error);
    return null;
  }
}

export async function getChainId(): Promise<number | null> {
  const provider = getBrowserProvider();
  if (!provider) return null;
  try {
    const network = await provider.getNetwork();
    return Number(network.chainId);
  } catch (error) {
    console.error("Failed to get chain ID:", error);
    return null;
  }
}

export async function switchToSepolia(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) return false;
  
  const sepoliaChainIdHex = "0xaa36a7"; // 11155111 in hex
  
  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: sepoliaChainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: sepoliaChainIdHex,
              chainName: "Sepolia Test Network",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://sepolia.drpc.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Sepolia network:", addError);
        return false;
      }
    }
    console.error("Failed to switch to Sepolia network:", switchError);
    return false;
  }
}

export async function switchToLocalhost(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) return false;

  const localhostChainIdHex = "0x7a69"; // 31337 in hex

  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: localhostChainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      try {
        await (window as any).ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: localhostChainIdHex,
              chainName: "Hardhat Local",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["http://127.0.0.1:8545"],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Hardhat Local network:", addError);
        return false;
      }
    }
    console.error("Failed to switch to Hardhat Local network:", switchError);
    return false;
  }
}

const LOCALHOST_CHAIN_ID = 31337;
const SEPOLIA_CHAIN_ID = 11155111;

export async function ensureNetwork(): Promise<boolean> {
  const chainId = await getChainId();
  if (chainId === LOCALHOST_CHAIN_ID || chainId === SEPOLIA_CHAIN_ID) return true;

  const targetChainId = Number(import.meta.env.VITE_TARGET_CHAIN_ID || SEPOLIA_CHAIN_ID);
  if (targetChainId === LOCALHOST_CHAIN_ID) {
    return await switchToLocalhost();
  }
  return await switchToSepolia();
}
