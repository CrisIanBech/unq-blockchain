import { connect, getChainId as getWagmiChainId, getConnection, getConnectors, switchChain } from "@wagmi/core";
import { sepolia } from "wagmi/chains";
import { isMobileBrowser, isWalletConnectConfigured, wagmiConfig } from "./wagmi-config";

function hasInjectedProvider(): boolean {
  return typeof window !== "undefined" && !!(window as Window & { ethereum?: unknown }).ethereum;
}

function pickConnectConnector() {
  const connectors = getConnectors(wagmiConfig);

  if (hasInjectedProvider()) {
    return connectors.find((connector) => connector.id === "injected") ?? connectors[0];
  }

  const walletConnectConnector = connectors.find((connector) => connector.id === "walletConnect");
  if (walletConnectConnector) {
    return walletConnectConnector;
  }

  if (isMobileBrowser()) {
    throw new Error(
      "Para conectar MetaMask desde el celular, agregá VITE_WALLETCONNECT_PROJECT_ID en .env o abrí la página en MetaMask → Browser."
    );
  }

  return connectors[0];
}

export function hasEthereumProvider(): boolean {
  if (typeof window === "undefined") return false;
  return hasInjectedProvider() || isWalletConnectConfigured();
}

export async function connectWallet(): Promise<string | null> {
  const connection = getConnection(wagmiConfig);
  if (connection.isConnected && connection.address) {
    return connection.address;
  }

  const connector = pickConnectConnector();
  if (!connector) {
    throw new Error(
      "No hay conector de wallet disponible. Instalá MetaMask o configurá VITE_WALLETCONNECT_PROJECT_ID."
    );
  }

  const result = await connect(wagmiConfig, { connector });
  return result.accounts[0] ?? null;
}

export async function getCurrentAccount(): Promise<string | null> {
  const connection = getConnection(wagmiConfig);
  if (connection.isConnected && connection.address) {
    return connection.address;
  }

  if (hasInjectedProvider()) {
    try {
      const accounts: string[] = await (
        window as unknown as { ethereum: { request: (args: { method: string }) => Promise<string[]> } }
      ).ethereum.request({ method: "eth_accounts" });
      return accounts[0] ?? null;
    } catch (error) {
      console.error("Failed to query injected accounts:", error);
    }
  }

  return null;
}

export async function getChainId(): Promise<number | null> {
  try {
    return await getWagmiChainId(wagmiConfig);
  } catch (error) {
    console.error("Failed to get chain ID:", error);
    return null;
  }
}

export async function switchToSepolia(): Promise<boolean> {
  try {
    await switchChain(wagmiConfig, { chainId: sepolia.id });
    return true;
  } catch (switchError: unknown) {
    const error = switchError as { code?: number; message?: string };
    if (error.code === 4902) {
      try {
        await switchChain(wagmiConfig, {
          chainId: sepolia.id,
          addEthereumChainParameter: {
            chainName: "Sepolia Test Network",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://sepolia.drpc.org"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          },
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
