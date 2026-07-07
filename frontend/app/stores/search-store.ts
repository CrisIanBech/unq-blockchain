import { create } from "zustand"
import type { Listing } from "@models/types"
import { useUserStore } from "./user-store"
import { formatPropertyImage } from "@/lib/format"
import { ReviewsRepository } from "@/lib/repositories/reviews-repository"

export const MAP_CENTER = { lat: -4126290, lng: -6485112 }

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`

interface SearchState {
  listings: Listing[]
  fetchListings: (lat: number, lng: number, radius?: number) => Promise<void>
  leaveReview: (listingId: string, rating: number, comment: string) => void
}

function mercatorToLatLon(latMercator: number, lonMercator: number) {
  const lon = (lonMercator / 20037508.34) * 180;
  const lat = (Math.atan(Math.exp((latMercator / 20037508.34) * Math.PI)) * 360) / Math.PI - 90;
  return { lat, lng: lon };
}

export const useSearchStore = create<SearchState>((set) => ({
  listings: [],

  fetchListings: async (lat, lng, radius = 15000) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/properties?lat=${lat}&lng=${lng}&radius=${radius}`);
      if (response.ok) {
        const data = await response.json();

        // First pass: map backend fields (reviews empty for now)
        const baseListings: Listing[] = data.map((p: any) => {
          const gps = mercatorToLatLon(p.location[1], p.location[0]);
          const metadataContact = p.metadata?.attributes?.find((a: any) => a.trait_type === "contact")?.value;
          return {
            id: p.tokenId.toString(),
            name: p.address,
            type: p.type,
            address: p.address,
            imageUrl: formatPropertyImage(p.images || p.image, p.address),
            monthlyRent: p.monthlyRent,
            lat: gps.lat,
            lng: gps.lng,
            beds: p.rooms || 0,
            baths: p.bathrooms || 0,
            m2: p.surface || 0,
            reviews: [],
            user: p.user,
            owner: p.owner,
            contact: metadataContact || p.metadata?.contact || p.contact || '',
            pets: Boolean(p.pets),
            garage: Boolean(p.garage),
          };
        });

        // Second pass: fetch on-chain reviews for all listings in parallel
        const reviewsPerListing = await Promise.all(
          baseListings.map((l) =>
            ReviewsRepository.getAllReviews(Number(l.id)).catch(() => [])
          )
        );

        const fetchedListings = baseListings.map((l, i) => ({
          ...l,
          reviews: reviewsPerListing[i].map((r, j) => ({
            id: `${l.id}-${j}`,
            author: r.author,
            rating: r.rating,
            comment: r.comment,
            date: new Date(r.timestamp * 1000).toISOString().slice(0, 10),
          })),
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
