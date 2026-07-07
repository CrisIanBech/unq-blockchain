import { useState } from "react"
import { usePropertiesStore } from "@stores/properties-store"
import { useRentalsStore } from "@stores/rentals-store"
import { useSmartlockStore } from "@stores/smartlock-store"

export function useSmartlockPage() {
  const { ownedProperties } = usePropertiesStore()
  const { rentals } = useRentalsStore()
  const {
    locks,
    installSmartlock,
    toggleNfc,
    setLockOpen,
    openTenantLock,
    toggleTenantNfc,
  } = useSmartlockStore()

  const [keyMode, setKeyMode] = useState(false)
  const [selOwned, setSelOwned] = useState(ownedProperties[0]?.id ?? "")
  const [selRental, setSelRental] = useState(rentals[0]?.id ?? "")

  const ownedProp = ownedProperties.find((p) => p.id === selOwned) ?? ownedProperties[0]
  const rental = rentals.find((r) => r.id === selRental) ?? rentals[0]

  const list = keyMode ? rentals : ownedProperties
  const selId = keyMode ? selRental : selOwned
  const setSel = keyMode ? setSelRental : setSelOwned

  const lock = locks[ownedProp?.id ?? ""]
  const active = keyMode ? !!rental?.hasKey : !!lock?.nfcEnabled
  const installed = keyMode ? true : !!lock?.installed

  const handlePower = () => {
    if (keyMode) {
      if (rental) toggleTenantNfc(rental.id)
    } else if (ownedProp) {
      toggleNfc(ownedProp.id)
    }
  }

  return {
    ownedProperties,
    rentals,
    keyMode,
    selOwned,
    selRental,
    ownedProp,
    rental,
    list,
    selId,
    active,
    installed,
    onSetKeyMode: setKeyMode,
    onSelectId: setSel,
    onPower: handlePower,
    onInstallSmartlock: installSmartlock,
    onSetLockOpen: setLockOpen,
    onOpenTenantLock: openTenantLock,
  }
}
export type UseSmartlockPageReturn = ReturnType<typeof useSmartlockPage>
