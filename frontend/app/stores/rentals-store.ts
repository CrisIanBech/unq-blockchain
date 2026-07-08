import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Rental } from "@models/types";
import { useUserStore } from "./user-store";
import { getServices } from "@/lib/services/service-registry";
import { getBrowserProvider } from "@/lib/blockchain-infra";

interface RentalsState {
  rentals: Rental[];
  rentalImports: { name: string; address: string }[];
  isSyncing: boolean;
  importRental: (name: string, agreementAddress: string) => Promise<void>;
  removeRental: (rentalId: string) => void;
  syncRentals: (background?: boolean) => Promise<void>;
}

export const useRentalsStore = create<RentalsState>()(
  persist(
    (set, get) => {

      return {
        rentals: [],
        rentalImports: [],
        isSyncing: true,

        importRental: async (name, agreementAddress) => {
          const userStore = useUserStore.getState();
          const imports = get().rentalImports;

          if (imports.find((r) => r.address.toLowerCase() === agreementAddress.toLowerCase())) {
            userStore.pushToast({ message: "El alquiler ya está cargado", severity: "warning" });
            return;
          }

          let toastId: number | undefined;
          try {
            const provider = getBrowserProvider();
            if (provider) {
              toastId = userStore.pushToast({ message: "Verificando el contrato en la blockchain...", severity: "info" });
              const code = await provider.getCode(agreementAddress);
              if (code === "0x") {
                userStore.pushToast({ id: toastId, message: "La dirección no es un contrato válido", severity: "error" });
                return;
              }
            }
          } catch (error) {
            console.error("Failed to verify contract:", error);
            userStore.pushToast({ id: toastId, message: "Error al verificar la dirección del contrato", severity: "error" });
            return;
          }

          set({ rentalImports: [{ name, address: agreementAddress }, ...imports] });
          userStore.pushToast({ id: toastId, message: "Contrato añadido, sincronizando...", severity: "info" });

          await get().syncRentals();
        },

        removeRental: (rentalId) => {
          const imports = get().rentalImports;
          const userStore = useUserStore.getState();
          set({
            rentalImports: imports.filter((r) => r.address.toLowerCase() !== rentalId.toLowerCase()),
            rentals: get().rentals.filter((r) => r.id.toLowerCase() !== rentalId.toLowerCase())
          });
          userStore.pushToast({ message: "Se ha eliminado tu contrato de tu listado", severity: "success" });
        },

        syncRentals: async () => {
          set({ isSyncing: true });

          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          const imports = get().rentalImports;

          try {
            const { rentalsService } = getServices();
            const rentalPromises = imports.map(async (imp) => {
              try {
                return await rentalsService.fetchRental(wallet, imp);
              } catch (e: any) {
                console.warn(`Error fetching rental ${imp.name}:`, e);
                userStore.pushToast({
                  message: `Error al cargar alquiler ${imp.name}: ` + (e.message || e.toString()),
                  severity: "error"
                });
                return null;
              }
            });

            const results = await Promise.all(rentalPromises);
            const loadedRentals: Rental[] = results.filter((r: Rental | null): r is Rental => r !== null);
            const userRentals = loadedRentals.filter(r =>
              wallet && r.landlord.toLowerCase() === wallet.toLowerCase()
            );

            set({ rentals: userRentals, isSyncing: false });
          } catch (error: any) {
            set({ isSyncing: false });

            console.error("Failed to sync rentals concurrently:", error);
            userStore.pushToast({
              message: "Error al cargar alquileres: " + (error.message || error.toString()),
              severity: "error"
            });
          }
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
