import { create } from "zustand";
import type { Toast } from "@models/types";
import { WalletService } from "../lib/services/wallet-service";

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
    if (address && import.meta.env.VITE_USE_MOCKS !== "true") {
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
}

export type UseUserStoreReturn = ReturnType<typeof useUserStore>;
