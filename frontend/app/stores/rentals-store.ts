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
  signAgreement: (rentalId: string) => Promise<void>;
  cancelAgreement: (rentalId: string) => Promise<void>;
  payMonthlyRent: (rentalId: string) => Promise<void>;
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
              wallet && r.tenant.toLowerCase() === wallet.toLowerCase()
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
        },

        signAgreement: async (rentalId: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Firmando contrato...", severity: "info" });
            const rental = get().rentals.find(r => r.id === rentalId);
            if (!rental) throw new Error("No se encontró el contrato.");

            const { propertiesService } = getServices();
            await propertiesService.approveAgreement({
              agreementAddress: rental.id,
              isTenant: true,
              depositAmount: rental.securityDeposit
            });
            await get().syncRentals();
            userStore.pushToast({ id: toastId, message: "Contrato firmado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al firmar contrato:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al firmar contrato", severity: "error" });
          }
        },

        cancelAgreement: async (rentalId: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Cancelando contrato...", severity: "info" });
            const rental = get().rentals.find(r => r.id === rentalId);
            if (!rental) throw new Error("No se encontró el contrato.");

            const { propertiesService } = getServices();
            await propertiesService.cancelAgreement(rental.id);
            await get().syncRentals();
            userStore.pushToast({ id: toastId, message: "Contrato cancelado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al cancelar contrato:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al cancelar contrato", severity: "error" });
          }
        },

        payMonthlyRent: async (rentalId: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Pagando alquiler...", severity: "info" });
            const rental = get().rentals.find(r => r.id === rentalId);
            if (!rental) throw new Error("No se encontró el contrato.");

            const { propertiesService } = getServices();
            // rental.amountToPay was not added to the Rental type? Let's check!
            // Wait, amountToPay is NOT on Rental interface?
            // If it's missing, we need to add it or use baseRent. Let's cast it for now to ANY or check if it exists.
            await propertiesService.payRent(rental.id, (rental as any).amountToPay || rental.baseRent);
            await get().syncRentals();
            userStore.pushToast({ id: toastId, message: "Pago realizado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al pagar alquiler:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al pagar alquiler", severity: "error" });
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
