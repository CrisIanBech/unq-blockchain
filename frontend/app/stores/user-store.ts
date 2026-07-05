import { create } from "zustand";
import type { Toast } from "@models/types";
import { WalletService } from "../lib/services/wallet-service";
import { usesMockRepositories } from "../lib/config/mock-mode";

const MOCK_USDC_BALANCE = 3250;
export function isWalletConnected(wallet: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(wallet);
}

interface UserState {
  wallet: string;
  balance: number;
  isConnecting: boolean;
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  adjustBalance: (amount: number) => void;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  syncOnchainBalance: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  wallet: "",
  balance: 0,
  isConnecting: false,
  toasts: [],

  pushToast: (t) => {
    set((state) => ({
      toasts: [...state.toasts, { ...t, id: Date.now() + Math.random() }]
    }));
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  adjustBalance: (amount) => {
    set((state) => ({
      balance: state.balance + amount
    }));
  },

  connectWallet: async () => {
    if (get().isConnecting) return;

    set({ isConnecting: true });
    try {
      get().pushToast({
        message: "Abriendo selector de wallet…",
        severity: "info",
      });

      const address = await WalletService.connect();
      if (address) {
        set({ wallet: address });

        const balance = usesMockRepositories()
          ? MOCK_USDC_BALANCE
          : Number(await WalletService.getUSDCBalance(address));
        set({ balance });
        get().pushToast({
          message: "Billetera conectada exitosamente a MetaMask",
          severity: "success",
        });
      } else {
        get().pushToast({
          message: "No se pudo obtener la dirección de la wallet",
          severity: "error",
        });
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      get().pushToast({
        message: error.message || "Error al conectar MetaMask",
        severity: "error",
      });
    } finally {
      set({ isConnecting: false });
    }
  },

  disconnectWallet: () => {
    set({ wallet: "", balance: 0 });
    get().pushToast({ message: "Billetera desconectada", severity: "info" });
  },

  syncOnchainBalance: async () => {
    const address = get().wallet;
    if (isWalletConnected(address) && !usesMockRepositories()) {
      try {
        const balance = await WalletService.getUSDCBalance(address);
        set({ balance });
      } catch (err) {
        console.error("Failed to sync balance:", err);
      }
    }
  }
}));

// Attempt to load current account on store load if already authorized
if (typeof window !== "undefined") {
  WalletService.getCurrentAccount().then(async (address) => {
    if (address) {
      useUserStore.setState({ wallet: address });
      try {
        const balance = usesMockRepositories()
          ? MOCK_USDC_BALANCE
          : Number(await WalletService.getUSDCBalance(address));
        useUserStore.setState({ balance });
      } catch {
        // Silently fail
      }
    }
  }).catch(() => {});
    // Listen for MetaMask account changes and update active wallet in real-time
    const ethereum = (window as any).ethereum;
    if (ethereum && !(window as any).__unq_accountsChangedListenerAdded) {
      (window as any).__unq_accountsChangedListenerAdded = true;
      ethereum.on("accountsChanged", async (accounts: string[]) => {
        const nextWallet = accounts[0] || "";
        const userStore = useUserStore.getState();
        const currentWallet = userStore.wallet;
        
        if (nextWallet.toLowerCase() !== currentWallet.toLowerCase()) {
          if (nextWallet) {
            useUserStore.setState({ wallet: nextWallet });
            try {
              const balance = await WalletService.getUSDCBalance(nextWallet);
              useUserStore.setState({ balance });
              userStore.pushToast({ message: "Cuenta de MetaMask cambiada", severity: "info" });
            } catch (err) {
              // Silently fail
            }
          } else {
            useUserStore.setState({ wallet: "", balance: 0 });
            userStore.pushToast({ message: "Billetera desconectada", severity: "info" });
          }
        }
      });
    }
  }

export type UseUserStoreReturn = ReturnType<typeof useUserStore>;
