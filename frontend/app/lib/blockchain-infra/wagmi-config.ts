import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "";

function dappOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "https://blockrent.com";
}

function isMobileUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

if (isMobileUserAgent() && !walletConnectProjectId) {
  console.warn(
    "[BlockRent] Set VITE_WALLETCONNECT_PROJECT_ID in .env to connect MetaMask from mobile Chrome."
  );
}

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [
    injected({ shimDisconnect: true }),
    ...(walletConnectProjectId
      ? [
          walletConnect({
            projectId: walletConnectProjectId,
            showQrModal: true,
            qrModalOptions: {
              enableMobileFullScreen: true,
            },
            metadata: {
              name: "BlockRent",
              description: "BlockRent — alquileres con blockchain",
              url: dappOrigin(),
              icons: [`${dappOrigin()}/favicon.ico`],
            },
          }),
        ]
      : []),
  ],
  transports: {
    [sepolia.id]: http("https://sepolia.drpc.org"),
  },
  ssr: false,
});

export function isWalletConnectConfigured(): boolean {
  return walletConnectProjectId.length > 0;
}

export function isMobileBrowser(): boolean {
  return isMobileUserAgent();
}

/** True when the page runs inside MetaMask's built-in browser (not Chrome/Firefox). */
export function isMetaMaskInAppBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ethereum = (window as Window & { ethereum?: { isMetaMask?: boolean } }).ethereum;
  if (!ethereum?.isMetaMask) return false;
  return /MetaMaskMobile/i.test(navigator.userAgent);
}
