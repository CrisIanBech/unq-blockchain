import { create } from "zustand"
import { usePropertiesStore } from "./properties-store"
import { useUserStore } from "./user-store"

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`

interface SmartlockState {
  installSmartlock: (propertyId: string) => void
  toggleNfc: (propertyId: string) => void
  setLockOpen: (propertyId: string, open: boolean) => void
  openTenantLock: (rentalId: string) => void
  toggleTenantNfc: (rentalId: string) => void
}

export const useSmartlockStore = create<SmartlockState>(() => ({
  installSmartlock: (propertyId) => {
    usePropertiesStore.setState((s) => ({
      ownedProperties: s.ownedProperties.map((p) =>
        p.id === propertyId ? { ...p, smartlock: { ...p.smartlock, installed: true } } : p
      )
    }))
    useUserStore.getState().pushToast({ message: "Cerradura virtual colocada y registrada on-chain", severity: "success", txHash: fakeTx() })
  },

  toggleNfc: (propertyId) => {
    usePropertiesStore.setState((s) => ({
      ownedProperties: s.ownedProperties.map((p) =>
        p.id === propertyId ? { ...p, smartlock: { ...p.smartlock, nfcEnabled: !p.smartlock.nfcEnabled } } : p
      )
    }))
  },

  setLockOpen: (propertyId, open) => {
    usePropertiesStore.setState((s) => ({
      ownedProperties: s.ownedProperties.map((p) =>
        p.id === propertyId
          ? { ...p, smartlock: { ...p.smartlock, unlocked: open, lastOpenedAt: open ? new Date().toISOString() : p.smartlock.lastOpenedAt } }
          : p
      )
    }))
  },

  openTenantLock: (rentalId) => {
    const rentals = usePropertiesStore.getState().rentals
    const rental = rentals.find((r) => r.id === rentalId)
    if (!rental?.hasKey) {
      useUserStore.getState().pushToast({ message: "No tenés una llave NFC asignada para esta unidad", severity: "error" })
      return
    }
    useUserStore.getState().pushToast({ message: `Smartlock abierto — ${rental.name}`, severity: "success", txHash: fakeTx() })
  },

  toggleTenantNfc: (rentalId) => {
    usePropertiesStore.setState((s) => ({
      rentals: s.rentals.map((r) => (r.id === rentalId ? { ...r, hasKey: !r.hasKey } : r))
    }))
  }
}))
export type UseSmartlockStoreReturn = ReturnType<typeof useSmartlockStore>
