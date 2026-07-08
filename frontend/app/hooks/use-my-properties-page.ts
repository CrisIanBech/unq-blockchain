import { useState, useEffect } from "react"
import { usePropertiesStore, type AddPropertyInput } from "@stores/properties-store"
import { useUserStore } from "@stores/user-store"

import { isPropertyOverdue, isPropertyContractActive, getPropertyNextChargeDate } from "@models/property-utils"

export function useMyPropertiesPage() {
  const { wallet } = useUserStore()
  const {
    isSyncing,
    ownedProperties,
    mintAndLoadProperty,
    withdrawRent,
    signContract,
    cancelContract,
    syncProperties,
    importProperty,
    unlinkContract,
    contractHistory,
    releaseDeposit,
    claimDeposit,
  } = usePropertiesStore()

  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)

  useEffect(() => {
    if (!wallet) return

    syncProperties()
  }, [wallet, syncProperties])

  const [monthIncome, setMonthIncome] = useState(0)
  const [nextCharge, setNextCharge] = useState<string | undefined>(undefined)
  const [occupancyStats, setOccupancyStats] = useState({ occupancy: 0, occupied: 0 })

  useEffect(() => {
    if (!ownedProperties.length) {
      setMonthIncome(0)
      setNextCharge(undefined)
      setOccupancyStats({ occupancy: 0, occupied: 0 })
      return
    }

    // Calcular ingreso del mes
    const income = ownedProperties.reduce((sum, p) => {
      if (isPropertyContractActive(p) && !isPropertyOverdue(p)) {
        return sum + (p.rental?.currentContract?.baseRent ?? 0)
      }
      return sum
    }, 0)
    setMonthIncome(income)

    // Calcular próxima fecha de cobro
    const nextDates = ownedProperties
      .map((p) => getPropertyNextChargeDate(p))
      .filter((d): d is string => Boolean(d))
      .sort()
    setNextCharge(nextDates[0])

    // Calcular ocupación
    const occupiedCount = ownedProperties.filter((p) => isPropertyContractActive(p)).length
    const occupancyRate = Math.round((occupiedCount / ownedProperties.length) * 100)
    setOccupancyStats({ occupancy: occupancyRate, occupied: occupiedCount })
  }, [ownedProperties])

  const onWithdrawRent = (id: string) => withdrawRent(id)
  const onSignContract = (id: string) => signContract(id)
  const onCancelContract = (id: string) => cancelContract(id)
  const onUnlinkContract = (id: string) => {
    const propertyId = Number(id.replace("own-", ""));
    unlinkContract(propertyId);
  }

  return {
    isSyncing,
    ownedProperties,
    contractHistory,
    addOpen,
    importOpen,
    depositOpen,
    monthIncome,
    nextCharge,
    occupancyStats,
    onOpenAdd: () => setAddOpen(true),
    onCloseAdd: () => setAddOpen(false),
    onOpenImport: () => setImportOpen(true),
    onCloseImport: () => setImportOpen(false),
    onSubmitImport: async (name: string, propertyId: number) => {
      await importProperty(name, propertyId)
      setImportOpen(false)
    },
    onWithdrawRent,
    onSignContract,
    onCancelContract,
    onUnlinkContract,
    onOpenDeposit: () => setDepositOpen(true),
    onCloseDeposit: () => setDepositOpen(false),
    onReleaseDeposit: releaseDeposit,
    onClaimDeposit: claimDeposit,
  }
}
export type UseMyPropertiesPageReturn = ReturnType<typeof useMyPropertiesPage>
