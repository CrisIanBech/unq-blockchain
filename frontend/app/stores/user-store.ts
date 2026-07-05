import { create } from "zustand";
import type { Toast } from "@models/types";
import { WalletService } from "../lib/services/wallet-service";

const MOCK_WALLET_ADDRESS = "0x7A3f...91Cd";
const MOCK_INITIAL_BALANCE = 3250;

export function isWalletConnected(wallet: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(wallet);
}

interface UserState {
  wallet: string;
  balance: number;
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
    try {
      const isMock = import.meta.env.VITE_USE_MOCKS === "true";
      if (isMock) {
        set({ wallet: "0xMockUser", balance: 3250 });
        get().pushToast({ message: "Mock wallet conectada", severity: "success" });
        return;
      }

      const address = await WalletService.connect();
      if (address) {
        set({ wallet: address });
        
        // Fetch actual on-chain USDC balance
        const balance = await WalletService.getUSDCBalance(address);
        set({ balance });

        get().pushToast({
          message: "Billetera conectada exitosamente a MetaMask",
          severity: "success"
        });
      }
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      get().pushToast({
        message: error.message || "Error al conectar MetaMask",
        severity: "error"
      });
    }
  },

  disconnectWallet: () => {
    set({ wallet: "", balance: 0 });
    get().pushToast({ message: "Billetera desconectada", severity: "info" });
  },

  syncOnchainBalance: async () => {
    const address = get().wallet;
    if (isWalletConnected(address) && import.meta.env.VITE_USE_MOCKS !== "true") {
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
if (import.meta.env.VITE_USE_MOCKS !== "true") {
  WalletService.getCurrentAccount().then(async (address) => {
    if (address) {
      useUserStore.setState({ wallet: address });
      try {
        const balance = await WalletService.getUSDCBalance(address);
        useUserStore.setState({ balance });
      } catch (err) {
        // Silently fail
      }
    }
  }).catch(() => {});
}

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
