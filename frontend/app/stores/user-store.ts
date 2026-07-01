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
  syncOnchainBalance: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  wallet: MOCK_WALLET_ADDRESS,
  balance: MOCK_INITIAL_BALANCE,
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

  syncOnchainBalance: async () => {
    const address = get().wallet;
    if (isWalletConnected(address)) {
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
    if (address && isWalletConnected(address)) {
      useUserStore.setState({ wallet: address });
      try {
        const balance = await WalletService.getUSDCBalance(address);
        useUserStore.setState({ balance });
      } catch (err) {
        // Silently fail, fall back to mock
      }
    }
  }).catch(() => {});
}

export type UseUserStoreReturn = ReturnType<typeof useUserStore>;
