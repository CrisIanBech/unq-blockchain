import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Rental } from "@models/types";
import { useUserStore } from "./user-store";
import { RentalDashboardService } from "@/lib/services/rental-dashboard-service";
import { loadRentals } from "@/lib/services/sync/rentals-sync";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";
const rentalDashboardService = new RentalDashboardService();

interface RentalsState {
  rentals: Rental[];
  rentalImports: { name: string; address: string }[];
  payMonthlyRent: (rentalId: string, month: string) => Promise<void>;
  importRental: (name: string, agreementAddress: string) => Promise<void>;
  syncRentals: () => Promise<void>;
  updateRentalKey: (rentalId: string, hasKey: boolean) => void;
}

export const useRentalsStore = create<RentalsState>()(
  persist(
    (set, get) => {
      let rentalsSyncVersion = 0;

      return {
        rentals: [],
        rentalImports: [],

        payMonthlyRent: async (rentalId, month) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;

          const r = get().rentals.find((x) => x.id === rentalId);
          if (!r) return;

          const already = r.payments.find((p) => p.month === month && p.status === "paid");
          if (already) {
            userStore.pushToast({ message: "El periodo ya estaba pagado", severity: "warning" });
            return;
          }

          const targetAgreement = r.agreementAddress;
          if (!targetAgreement) {
            userStore.pushToast({ message: "No hay contrato en esta propiedad para pagar", severity: "error" });
            return;
          }

          if (isMock) {
            const balance = userStore.balance;
            if (balance < (r.contractDetails?.amountToPay || r.monthlyRent)) {
              userStore.pushToast({ message: "Saldo USDC insuficiente", severity: "error" });
              return;
            }
          }

          try {
            userStore.pushToast({
              message: "Enviando pago de alquiler a la blockchain...",
              severity: "info"
            });

            const amountToPay = r.contractDetails?.amountToPay || r.monthlyRent;
            const result = await rentalDashboardService.payRent(wallet, targetAgreement, amountToPay, month);

            set((s) => ({
              rentals: s.rentals.map((item) => {
                if (item.id !== rentalId) return item;
                return {
                  ...item,
                  payments: [...result.payments, ...item.payments].slice(
                    0,
                    Math.max(result.payments.length, item.payments.length)
                  )
                };
              })
            }));

            const syncPromise = get().syncRentals();

            if (!isMock) {
              await userStore.syncOnchainBalance();
            } else {
              userStore.adjustBalance(-amountToPay);
            }

            await syncPromise;

            userStore.pushToast({
              message: "Pago procesado con éxito",
              severity: "success",
              txHash: result.txHash
            });
          } catch (err: any) {
            console.error("Failed to pay monthly rent:", err);
            userStore.pushToast({
              message: err.message || "Error al procesar pago de alquiler en la blockchain",
              severity: "error"
            });
          }
        },

        importRental: async (name, agreementAddress) => {
          const userStore = useUserStore.getState();
          const imports = get().rentalImports;

          if (imports.find((r) => r.address === agreementAddress)) {
            userStore.pushToast({ message: "El alquiler ya está cargado", severity: "warning" });
            return;
          }

          set({ rentalImports: [{ name, address: agreementAddress }, ...imports] });
          userStore.pushToast({ message: "Contrato añadido, sincronizando...", severity: "info" });

          await get().syncRentals();
        },

        syncRentals: async () => {
          rentalsSyncVersion++;
          const currentVersion = rentalsSyncVersion;

          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          const imports = get().rentalImports;

          try {
            const loadedRentals = await loadRentals(wallet, imports);

            if (currentVersion !== rentalsSyncVersion) {
              return;
            }

            set({ rentals: loadedRentals });
          } catch (error: any) {
            if (currentVersion !== rentalsSyncVersion) {
              return;
            }
            console.error("Failed to sync rentals concurrently:", error);
            userStore.pushToast({
              message: "Error al cargar alquileres: " + (error.message || error.toString()),
              severity: "error"
            });
          }
        },

        updateRentalKey: (rentalId, hasKey) => {
          set((s) => ({
            rentals: s.rentals.map((r) => (r.id === rentalId ? { ...r, hasKey } : r))
          }));
        }
      };
    },
    {
      name: "rentals-store-storage",
      partialize: (state) => ({ rentalImports: state.rentalImports })
    }
  )
);

export type UseRentalsStoreReturn = ReturnType<typeof useRentalsStore>;
