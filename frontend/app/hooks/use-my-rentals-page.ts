import { useState, useEffect } from "react"
import { useUserStore } from "@stores/user-store"
import { usePropertiesStore } from "@stores/properties-store"
import type { Rental } from "../models/types"
import { getBrowserProvider } from "@/lib/blockchain-infra"

export function useMyRentalsPage() {
  const { balance, wallet } = useUserStore()
  const { rentals, payMonthlyRent, importRental, syncRentals } = usePropertiesStore()
  const [payTargetId, setPayTargetId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(true)
  const [addRentalOpen, setAddRentalOpen] = useState(false)

  useEffect(() => {
    if (!wallet) return

    setIsSyncing(true)
    syncRentals().finally(() => setIsSyncing(false))

    // Listen for new blocks to reload rental details automatically
    const provider = getBrowserProvider()
    if (provider) {
      const listener = () => {
        syncRentals()
      }
      provider.on("block", listener)
      return () => {
        provider.off("block", listener)
      }
    }
  }, [wallet, syncRentals])

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
    onOpenAddRental: handleOpenAddRental,
    onCloseAddRental: handleCloseAddRental,
    onImportRental: handleImportRental,
  }
}
export type UseMyRentalsPageReturn = ReturnType<typeof useMyRentalsPage>
