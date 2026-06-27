import { useState, useMemo } from "react"
import { usePropertiesStore, type AddPropertyInput } from "@stores/properties-store"
import { CURRENT_MONTH } from "@/lib/format"

export function useMyPropertiesPage() {
  const {
    ownedProperties,
    mintAndLoadProperty,
    withdrawRent,
    signContract,
    cancelContract,
    createContract,
  } = usePropertiesStore()

  const [addOpen, setAddOpen] = useState(false)

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

  return {
    ownedProperties,
    addOpen,
    stats,
    onOpenAdd: handleOpenAdd,
    onCloseAdd: handleCloseAdd,
    onSubmitAdd: handleSubmitAdd,
    onWithdrawRent: withdrawRent,
    onSignContract: signContract,
    onCancelContract: cancelContract,
    onCreateContract: createContract,
  }
}
export type UseMyPropertiesPageReturn = ReturnType<typeof useMyPropertiesPage>
