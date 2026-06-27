import { create } from "zustand"
import type { Toast } from "@models/types"

const WALLET_ADDRESS = "0x7A3f...91Cd"

interface UserState {
  wallet: string
  balance: number
  toasts: Toast[]
  pushToast: (t: Omit<Toast, "id">) => void
  dismissToast: (id: number) => void
  adjustBalance: (amount: number) => void
}

export const useUserStore = create<UserState>((set) => ({
  wallet: WALLET_ADDRESS,
  balance: 3250,
  toasts: [],

  pushToast: (t) => {
    set((state) => ({
      toasts: [...state.toasts, { ...t, id: Date.now() + Math.random() }]
    }))
  },

  dismissToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  },

  adjustBalance: (amount) => {
    set((state) => ({
      balance: state.balance + amount
    }))
  }
}))
