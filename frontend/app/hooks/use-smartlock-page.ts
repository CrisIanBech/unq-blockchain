import { useEffect, useState } from "react"
import { usePropertiesStore } from "@stores/properties-store"
import { signChallengeFromUrl, useSmartlockStore } from "@stores/smartlock-store"
import { SmartlockService } from "@/lib/services/smartlock-service"
import { hasEthereumProvider } from "@/lib/blockchain-infra/wallet"
import { isSmartlockMockMode } from "@/lib/smartlock/config"

export function useSmartlockPage() {
  const { ownedProperties, rentals } = usePropertiesStore()
  const {
    installSmartlock,
    toggleNfc,
    setLockOpen,
    openTenantLock,
    unlockLandlordLock,
    toggleTenantNfc,
    isUnlocking,
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
  const nfcAvailable = SmartlockService.isNfcAvailable()
  const nfcApiPresent = SmartlockService.isNfcApiPresent()
  const mockMode = isSmartlockMockMode()
  const walletAvailable = typeof window !== "undefined" && hasEthereumProvider()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const challenge = params.get("challenge")
    if (!challenge) return

    const agreement = params.get("agreement") ?? undefined
    const roleParam = params.get("role")
    const expectedRole = roleParam === "tenant" ? "tenant" : roleParam === "landlord" ? "landlord" : undefined
    signChallengeFromUrl(challenge, agreement, expectedRole).finally(() => {
      params.delete("challenge")
      params.delete("agreement")
      params.delete("role")
      const next = params.toString()
      const url = next ? `${window.location.pathname}?${next}` : window.location.pathname
      window.history.replaceState({}, "", url)
    })
  }, [])

  const handlePower = () => {
    if (keyMode) {
      if (rental) toggleTenantNfc(rental.id)
    } else if (ownedProp) {
      toggleNfc(ownedProp.id)
    }
  }

  const handleOpenTenantLock = () => {
    if (rental) void openTenantLock(rental.id)
  }

  const handleUnlockLandlord = () => {
    if (ownedProp) void unlockLandlordLock(ownedProp.id)
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
    isUnlocking,
    nfcAvailable,
    nfcApiPresent,
    mockMode,
    walletAvailable,
    onSetKeyMode: setKeyMode,
    onSelectId: setSel,
    onPower: handlePower,
    onInstallSmartlock: installSmartlock,
    onSetLockOpen: setLockOpen,
    onOpenTenantLock: handleOpenTenantLock,
    onUnlockLandlord: handleUnlockLandlord,
  }
}
export type UseSmartlockPageReturn = ReturnType<typeof useSmartlockPage>
