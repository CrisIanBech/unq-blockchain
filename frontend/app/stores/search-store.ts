import { create } from "zustand"
import type { Listing } from "@models/types"
import { useUserStore } from "./user-store"

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`

interface SearchState {
  listings: Listing[]
  leaveReview: (listingId: string, rating: number, comment: string) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  listings: [],

  leaveReview: (listingId, rating, comment) => {
    set((s) => ({
      listings: s.listings.map((l) =>
        l.id === listingId
          ? {
              ...l,
              reviews: [
                { id: `r-${Date.now()}`, author: useUserStore.getState().wallet || "Anonymous", rating, comment, date: new Date().toISOString().slice(0, 10) },
                ...l.reviews,
              ],
            }
          : l
      )
    }))
    useUserStore.getState().pushToast({ message: "Review publicada (firmada con tu wallet)", severity: "success", txHash: fakeTx() })
  }
}))
export type UseSearchStoreReturn = ReturnType<typeof useSearchStore>
