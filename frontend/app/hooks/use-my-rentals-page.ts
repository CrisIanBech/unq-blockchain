import { useState } from "react"
import { useUserStore } from "@stores/user-store"
import { usePropertiesStore } from "@stores/properties-store"
import type { Rental } from "../models/types"

export function useMyRentalsPage() {
  const { balance } = useUserStore()
  const { rentals, payMonthlyRent } = usePropertiesStore()
  const [payTarget, setPayTarget] = useState<Rental | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  function handleToggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  return {
    rentals,
    balance,
    payTarget,
    expanded,
    onSetPayTarget: setPayTarget,
    onToggleExpand: handleToggleExpand,
    onPayRent: payMonthlyRent,
  }
}
export type UseMyRentalsPageReturn = ReturnType<typeof useMyRentalsPage>
