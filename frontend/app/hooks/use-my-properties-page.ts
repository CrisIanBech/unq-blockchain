import { useState, useMemo, useEffect } from "react"
import { usePropertiesStore, type AddPropertyInput } from "@stores/properties-store"
import { useUserStore } from "@stores/user-store"
import { CURRENT_MONTH } from "@/lib/format"
import { getBrowserProvider } from "@/lib/blockchain-infra"

export function useMyPropertiesPage() {
  const { wallet } = useUserStore()
  const {
    ownedProperties,
    mintAndLoadProperty,
    withdrawRent,
    signContract,
    cancelContract,
    createContract,
    syncOwnedProperties,
    importProperty,
  } = usePropertiesStore()

  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (!wallet) return

    setIsSyncing(true)
    syncOwnedProperties().finally(() => setIsSyncing(false))

    // Listen for new blocks to keep UI reactive in real-time
    const provider = getBrowserProvider()
    if (provider) {
      const listener = () => {
        syncOwnedProperties()
      }
      provider.on("block", listener)
      return () => {
        provider.off("block", listener)
      }
    }
  }, [wallet, syncOwnedProperties])

  const stats = useMemo(() => {
    const monthIncome = ownedProperties.reduce((sum, p) => {
      const paid = p.payments.find((x) => x.month === CURRENT_MONTH && x.status === "paid")
      return sum + (paid?.amount ?? 0)
    }, 0)

    const nextDates = ownedProperties
      .map((p) => p.nextChargeDate)
      .filter((d): d is string => Boolean(d))
      .sort()
    const nextCharge = nextDates[0]

    const occupied = ownedProperties.filter((p) => p.tenant).length
    const occupancy = ownedProperties.length ? Math.round((occupied / ownedProperties.length) * 100) : 0

    return { monthIncome, nextCharge, occupancy, occupied }
  }, [ownedProperties])

  function handleOpenAdd() {
    setAddOpen(true)
  }

  function handleCloseAdd() {
    setAddOpen(false)
  }

  function handleSubmitAdd(input: AddPropertyInput) {
    mintAndLoadProperty(input)
  }

  function handleOpenImport() {
    setImportOpen(true)
  }

  function handleCloseImport() {
    setImportOpen(false)
  }

  function handleSubmitImport(propertyId: number) {
    importProperty(propertyId)
  }

  return {
    ownedProperties,
    addOpen,
    importOpen,
    stats,
    isSyncing,
    onOpenAdd: handleOpenAdd,
    onCloseAdd: handleCloseAdd,
    onSubmitAdd: handleSubmitAdd,
    onOpenImport: handleOpenImport,
    onCloseImport: handleCloseImport,
    onSubmitImport: handleSubmitImport,
    onWithdrawRent: withdrawRent,
    onSignContract: signContract,
    onCancelContract: cancelContract,
    onCreateContract: createContract,
  }
}
export type UseMyPropertiesPageReturn = ReturnType<typeof useMyPropertiesPage>

