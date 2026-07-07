import { create } from "zustand";
import { useRentalsStore } from "./rentals-store";
import { useUserStore } from "./user-store";
import type { Smartlock } from "@models/types";

interface SmartlockState {
  locks: Record<string, Smartlock>;
  installSmartlock: (propertyId: string) => void;
  toggleNfc: (propertyId: string) => void;
  setLockOpen: (propertyId: string, open: boolean) => void;
  openTenantLock: (rentalId: string) => void;
  toggleTenantNfc: (rentalId: string) => void;
}

export const useSmartlockStore = create<SmartlockState>((set, get) => ({
  locks: {},

  installSmartlock: (propertyId) => {
    set((state) => ({
      locks: {
        ...state.locks,
        [propertyId]: { installed: true, nfcEnabled: true, open: false }
      }
    }));
    useUserStore.getState().pushToast({
      message: "Smartlock activado en esta propiedad",
      severity: "success"
    });
  },

  toggleNfc: (propertyId) => {
    set((state) => {
      const lock = state.locks[propertyId];
      if (!lock) return state;
      
      const newState = !lock.nfcEnabled;
      
      useUserStore.getState().pushToast({
        message: newState ? "NFC encendido" : "NFC apagado",
        severity: "info"
      });

      return {
        locks: {
          ...state.locks,
          [propertyId]: { ...lock, nfcEnabled: newState }
        }
      };
    });
  },

  setLockOpen: (propertyId, open) => {
    set((state) => {
      const lock = state.locks[propertyId];
      if (!lock) return state;
      return {
        locks: {
          ...state.locks,
          [propertyId]: { ...lock, open }
        }
      };
    });
    useUserStore.getState().pushToast({
      message: open ? "Smartlock abierto" : "Smartlock cerrado",
      severity: "success"
    });
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
      message: `Smartlock abierto`,
      severity: "success"
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
