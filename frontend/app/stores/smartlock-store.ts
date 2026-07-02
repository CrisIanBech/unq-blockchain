import { create } from "zustand";
import { usePropertiesStore } from "./properties-store";
import { useRentalsStore } from "./rentals-store";
import { useUserStore } from "./user-store";

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

interface SmartlockState {
  installSmartlock: (propertyId: string) => void;
  toggleNfc: (propertyId: string) => void;
  setLockOpen: (propertyId: string, open: boolean) => void;
  openTenantLock: (rentalId: string) => void;
  toggleTenantNfc: (rentalId: string) => void;
}

export const useSmartlockStore = create<SmartlockState>(() => ({
  installSmartlock: (propertyId) => {
    usePropertiesStore.getState().updateSmartlock(propertyId, { installed: true });
    useUserStore.getState().pushToast({
      message: "Cerradura virtual colocada y registrada on-chain",
      severity: "success",
      txHash: fakeTx()
    });
  },

  toggleNfc: (propertyId) => {
    const property = usePropertiesStore.getState().ownedProperties.find((p) => p.id === propertyId);
    if (property) {
      usePropertiesStore.getState().updateSmartlock(propertyId, { nfcEnabled: !property.smartlock.nfcEnabled });
    }
  },

  setLockOpen: (propertyId, open) => {
    const property = usePropertiesStore.getState().ownedProperties.find((p) => p.id === propertyId);
    if (property) {
      usePropertiesStore.getState().updateSmartlock(propertyId, {
        unlocked: open,
        lastOpenedAt: open ? new Date().toISOString() : property.smartlock.lastOpenedAt
      });
    }
  },

  openTenantLock: (rentalId) => {
    const rentals = useRentalsStore.getState().rentals;
    const rental = rentals.find((r) => r.id === rentalId);
    if (!rental?.hasKey) {
      useUserStore.getState().pushToast({
        message: "No tenés una llave NFC asignada para esta unidad",
        severity: "error"
      });
      return;
    }
    useUserStore.getState().pushToast({
      message: `Smartlock abierto — ${rental.name}`,
      severity: "success",
      txHash: fakeTx()
    });
  },

  toggleTenantNfc: (rentalId) => {
    const rental = useRentalsStore.getState().rentals.find((r) => r.id === rentalId);
    if (rental) {
      useRentalsStore.getState().updateRentalKey(rentalId, !rental.hasKey);
    }
  }
}));

export type UseSmartlockStoreReturn = ReturnType<typeof useSmartlockStore>;
