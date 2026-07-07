import { create } from "zustand"
import type { Listing } from "@models/types"
import { useUserStore } from "./user-store"
import { formatPropertyImage } from "@/lib/format"

export const MAP_CENTER = { lat: -4126290, lng: -6485112 }

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`

interface SearchState {
  listings: Listing[]
  fetchListings: (lat: number, lng: number, radius?: number) => Promise<void>
  leaveReview: (listingId: string, rating: number, comment: string) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  listings: [],

  fetchListings: async (lat, lng, radius = 15000) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/properties?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedListings: Listing[] = data.map((p: any) => ({
          id: p.tokenId.toString(),
          name: p.address,
          type: p.type,
          address: p.address,
          imageUrl: formatPropertyImage(p.images || p.image, p.address),
          monthlyRent: p.monthlyRent,
          lat: p.location[1],
          lng: p.location[0],
          beds: p.rooms || 0,
          baths: p.bathrooms || 0,
          m2: p.surface || 0,
          reviews: []
        }));

        set(() => ({ listings: fetchedListings }));
      }
    } catch (e) {
      console.error("Error fetching listings from backend:", e);
    }
  },

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
