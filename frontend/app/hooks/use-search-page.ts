import { useState, useMemo, useEffect } from "react"
import { useSearchStore } from "@stores/search-store"
import { usePropertiesStore } from "@stores/properties-store"
import type { Listing, PropertyType } from "../models/types"
import { MAP_CENTER } from "../models/mock-data"

export function useSearchPage() {
  const { listings, fetchListings, leaveReview } = useSearchStore()
  const { createContract } = usePropertiesStore()
  const [query, setQuery] = useState("")
  const [cat, setCat] = useState<"todos" | PropertyType>("todos")
  const [selected, setSelected] = useState<Listing | null>(null)
  const [listOpen, setListOpen] = useState(true)
  const [rating, setRating] = useState<number | null>(4)
  const [comment, setComment] = useState("")

  useEffect(() => {
    fetchListings(MAP_CENTER.lat, MAP_CENTER.lng, 15000)
  }, [fetchListings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((l) => {
      const matchCat = cat === "todos" || l.type === cat
      const matchQ = !q || l.name.toLowerCase().includes(q) || l.address.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [listings, query, cat])

  const liveSelected = selected ? listings.find((l) => l.id === selected.id) ?? null : null

  function handleRequestContract(listing: Listing) {
    createContract(listing.id, "0x7A3f...91Cd", listing.monthlyRent)
    alert(`Solicitud de contrato enviada para "${listing.name}"`)
  }

  function handleLeaveReview(listingId: string, ratingVal: number, commentVal: string) {
    leaveReview(listingId, ratingVal, commentVal)
    setComment("")
    setRating(4)
  }

  return {
    listings,
    query,
    cat,
    selected,
    listOpen,
    filtered,
    liveSelected,
    rating,
    comment,
    onSetQuery: setQuery,
    onSetCat: setCat,
    onSelect: setSelected,
    onToggleList: setListOpen,
    onLeaveReview: handleLeaveReview,
    onRequestContract: handleRequestContract,
    onSetRating: setRating,
    onSetComment: setComment,
  }
}
export type UseSearchPageReturn = ReturnType<typeof useSearchPage>
