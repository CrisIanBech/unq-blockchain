import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Rental } from "@models/types";
import { useUserStore } from "./user-store";
import { getServices } from "@/lib/services/service-registry";
import { loadRentals } from "@/lib/services/sync/rentals-sync";
import { getBrowserProvider } from "@/lib/blockchain-infra";

interface RentalsState {
  rentals: Rental[];
  rentalImports: { name: string; address: string }[];
  payMonthlyRent: (rentalId: string, month: string) => Promise<void>;
  signAgreement: (rentalId: string) => Promise<void>;
  cancelAgreement: (rentalId: string) => Promise<void>;
  importRental: (name: string, agreementAddress: string) => Promise<void>;
  removeRental: (rentalId: string) => void;
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

          try {
            userStore.pushToast({
              message: "Enviando pago de alquiler a la blockchain...",
              severity: "info"
            });

            const amountToPay = r.contractDetails?.amountToPay || r.monthlyRent;
            const { rentalsService } = getServices(wallet);
            const result = await rentalsService.payRent(targetAgreement, amountToPay);

            const syncPromise = get().syncRentals();

            await userStore.syncOnchainBalance();

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

        signAgreement: async (rentalId) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;

          const r = get().rentals.find((x) => x.id === rentalId);
          if (!r || !r.agreementAddress) return;

          try {
            const depositAmount = r.contractDetails?.securityDeposit ?? 0;
            const isTenant = r.tenant?.toLowerCase() === wallet?.toLowerCase();
            
            userStore.pushToast({ message: "Aprobando contrato en la blockchain...", severity: "info" });
            const { rentalsService } = getServices(wallet);
            const tx = await rentalsService.approveAgreement({ agreementAddress: r.agreementAddress, depositAmount, isTenant });
            userStore.pushToast({ message: "Contrato firmado con éxito", severity: "success", txHash: tx.txHash });
            
            await get().syncRentals();
            await userStore.syncOnchainBalance();
          } catch (err: any) {
            console.error("Failed to sign agreement:", err);
            userStore.pushToast({
              message: err.message || "Error al firmar el contrato",
              severity: "error"
            });
            throw err;
          }
        },

        cancelAgreement: async (rentalId) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;

          const r = get().rentals.find((x) => x.id === rentalId);
          if (!r || !r.agreementAddress) return;

          try {
            userStore.pushToast({ message: "Cancelando contrato en la blockchain...", severity: "info" });
            const { rentalsService } = getServices(wallet);
            const tx = await rentalsService.cancelAgreement(r.agreementAddress);
            userStore.pushToast({ message: "Cancelación procesada con éxito", severity: "success", txHash: tx.txHash });
            
            await get().syncRentals();
          } catch (err: any) {
            console.error("Failed to cancel agreement:", err);
            userStore.pushToast({
              message: err.message || "Error al cancelar el contrato",
              severity: "error"
            });
            throw err;
          }
        },

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
