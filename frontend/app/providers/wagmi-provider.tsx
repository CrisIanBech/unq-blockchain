import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useConnection, useReconnect } from "wagmi";
import { wagmiConfig } from "@/lib/blockchain-infra/wagmi-config";
import { useUserStore } from "@stores/user-store";
import { WalletService } from "@/lib/services/wallet-service";

const queryClient = new QueryClient();

function WalletSync() {
  const { address, isConnected } = useConnection();
  const { reconnect } = useReconnect();

  useEffect(() => {
    void reconnect();
  }, [reconnect]);

  // After approving in the MetaMask app, Chrome regains focus — reconnect then.
  useEffect(() => {
    const onReturnToBrowser = () => {
      if (document.visibilityState === "visible") {
        void reconnect();
      }
    };

    document.addEventListener("visibilitychange", onReturnToBrowser);
    window.addEventListener("focus", onReturnToBrowser);
    return () => {
      document.removeEventListener("visibilitychange", onReturnToBrowser);
      window.removeEventListener("focus", onReturnToBrowser);
    };
  }, [reconnect]);

  useEffect(() => {
    if (!isConnected || !address) return;

    useUserStore.setState({ wallet: address });
    WalletService.getUSDCBalance(address)
      .then((balance) => useUserStore.setState({ balance }))
      .catch(() => {});
  }, [isConnected, address]);

  return null;
}

export function AppWagmiProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletSync />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
