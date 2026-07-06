import { create } from "zustand"
import type { Listing } from "@models/types"
import { initialListings } from "@models/mock-data"
import { useUserStore } from "./user-store"

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`

interface SearchState {
  listings: Listing[]
  fetchListings: (lat: number, lng: number, radius?: number) => Promise<void>
  leaveReview: (listingId: string, rating: number, comment: string) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  listings: initialListings,

  fetchListings: async (lat, lng, radius = 15000) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/properties?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (response.ok) {
        const data = await response.json();
        const fetchedListings: Listing[] = data.map((p: any) => ({
          id: p.tokenId.toString(),
          name: p.name,
          type: p.type,
          address: p.address,
          imageUrl: p.image || `/images/prop-${(p.tokenId % 5) + 1}.png`,
          monthlyRent: p.monthlyRent,
          lat: p.location.coordinates[1],
          lng: p.location.coordinates[0],
          beds: 2,
          baths: 1,
          m2: 70,
          reviews: []
        }));

        set(() => {
          const combined = [...fetchedListings];
          for (const initial of initialListings) {
            if (!combined.some((c) => c.id === initial.id)) {
              combined.push(initial);
            }
          }
          return { listings: combined };
        });
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
