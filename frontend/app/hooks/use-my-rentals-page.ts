import { useState, useEffect } from "react"
import { useUserStore } from "@stores/user-store"
import { useRentalsStore } from "@stores/rentals-store"
import type { Rental } from "../models/types"

export function useMyRentalsPage() {
  const { balance } = useUserStore()
  const { rentals, isSyncing, payMonthlyRent, importRental, syncRentals, signAgreement, removeRental, cancelAgreement } = useRentalsStore()
  const [payTargetId, setPayTargetId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addRentalOpen, setAddRentalOpen] = useState(false)

  useEffect(() => {
    syncRentals()
  }, [syncRentals])

  const payTarget = rentals.find(r => r.id === payTargetId) || null

  function handleSetPayTarget(rental: Rental | null) {
    setPayTargetId(rental ? rental.id : null)
  }

  function handleToggleExpand(id: string) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  function handleOpenAddRental() {
    setAddRentalOpen(true)
  }

  function handleCloseAddRental() {
    setAddRentalOpen(false)
  }

  function handleImportRental(name: string, address: string) {
    importRental(name, address)
  }

  return {
    rentals,
    balance,
    payTarget,
    expanded,
    isSyncing,
    addRentalOpen,
    onSetPayTarget: handleSetPayTarget,
    onToggleExpand: handleToggleExpand,
    onPayRent: payMonthlyRent,
    onSignAgreement: signAgreement,
    onCancelAgreement: cancelAgreement,
    onNavigateToSmartlock: (_id: string) => { },
    onOpenAddRental: handleOpenAddRental,
    onCloseAddRental: handleCloseAddRental,
    onImportRental: handleImportRental,
    onRemoveRental: removeRental,
  }
}
export type UseMyRentalsPageReturn = ReturnType<typeof useMyRentalsPage>
