import { useState } from "react"
import { usePropertiesStore } from "@stores/properties-store"
import { useSmartlockStore } from "@stores/smartlock-store"

export function useSmartlockPage() {
  const { ownedProperties, rentals } = usePropertiesStore()
  const {
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

  const active = keyMode ? !!rental?.hasKey : !!ownedProp?.smartlock.nfcEnabled
  const installed = keyMode ? true : !!ownedProp?.smartlock.installed

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
