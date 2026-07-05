import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OwnedProperty, Smartlock } from "@models/types";
import { useUserStore, isWalletConnected } from "./user-store";
import { getServices } from "@/lib/services/service-registry";
import { PropertyDashboardService, type AddPropertyInput } from "@/lib/services/property-dashboard-service";
import { loadOwnedProperties } from "@/lib/services/sync/owned-properties-sync";
import { usesMockRepositories } from "@/lib/config/mock-mode";
import { ensureMockDemoProperty } from "@/lib/repositories/mock-properties-repository";

const propertyDashboardService = new PropertyDashboardService();

export type { AddPropertyInput };

interface PropertiesState {
  ownedProperties: OwnedProperty[];
  propertyImports: number[];
  mintAndLoadProperty: (input: AddPropertyInput) => Promise<void>;
  withdrawRent: (propertyId: string) => Promise<void>;
  createContract: (propertyId: string, tenant: string, rent: number) => Promise<void>;
  signContract: (propertyId: string) => Promise<void>;
  cancelContract: (propertyId: string) => Promise<void>;
  importProperty: (propertyId: number) => Promise<void>;
  syncOwnedProperties: () => Promise<void>;
  updateSmartlock: (propertyId: string, updates: Partial<Smartlock>) => void;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => {
      let ownedPropertiesSyncVersion = 0;

      return {
        ownedProperties: [],
        propertyImports: [],

        mintAndLoadProperty: async (input) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;

          try {
            userStore.pushToast({
              message: "Minteando NFT de Propiedad en la blockchain...",
              severity: "info"
            });

            const result = await propertyDashboardService.mintProperty(wallet, input);

            if (result.tokenId !== undefined) {
              set((s) => ({ propertyImports: [...(s.propertyImports || []), result.tokenId!] }));
            }

            await get().syncOwnedProperties();

            userStore.pushToast({
              message: `Tokens minteados y propiedad "${input.name}" cargada on-chain`,
              severity: "success",
              txHash: result.txHash,
            });
          } catch (err: any) {
            console.error("Failed to mint property NFT:", err);
            userStore.pushToast({
              message: err.message || "Error al mintear propiedad en blockchain",
              severity: "error"
            });
          }
        },

        withdrawRent: async (propertyId) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          const { rentalsService } = getServices(wallet);

          const property = get().ownedProperties.find((p) => p.id === propertyId);
          if (!property) return;

          const targetAgreement = property.agreementAddress || property.rentalToken;
          if (!targetAgreement) {
            userStore.pushToast({ message: "No hay contrato en esta propiedad para retirar", severity: "error" });
            return;
          }

          try {
            userStore.pushToast({
              message: "Retirando USDC acumulados de la blockchain...",
              severity: "info"
            });

            const result = await rentalsService.withdrawRent(targetAgreement);

            set((state) => ({
              ownedProperties: state.ownedProperties.map((p) =>
                p.id === propertyId ? { ...p, availableToWithdraw: 0 } : p
              )
            }));

            await get().syncOwnedProperties();

            const isMock = import.meta.env.VITE_USE_MOCKS === "true";
            if (!isMock) {
              await userStore.syncOnchainBalance();
            }

            userStore.pushToast({
              message: `Retiro exitoso de USDC de "${property.name}"`,
              severity: "success",
              txHash: result.txHash
            });
          } catch (err: any) {
            console.error("Failed to withdraw rent:", err);
            userStore.pushToast({
              message: err.message || "Error al retirar fondos de la blockchain",
              severity: "error"
            });
          }
        },

        createContract: async (propertyId, tenant, rent) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;

          const property = get().ownedProperties.find((p) => p.id === propertyId);
          if (!property) return;

          try {
            userStore.pushToast({
              message: "Desplegando contrato de alquiler en blockchain...",
              severity: "info"
            });

            const dynamicPropertyId = property.propertyId || 1;
            const result = await propertyDashboardService.createContract(wallet, dynamicPropertyId, tenant, rent);

            set((s) => ({
              ownedProperties: s.ownedProperties.map((p) =>
                p.id === propertyId ? { ...p, contractStatus: "draft", tenant, monthlyRent: rent, agreementAddress: result.agreementAddress } : p
              )
            }));

            await get().syncOwnedProperties();

            userStore.pushToast({
              message: `Contrato de alquiler creado en ${result.agreementAddress}`,
              severity: "success",
              txHash: result.txHash
            });
          } catch (err: any) {
            console.error("Failed to deploy rental agreement:", err);
            userStore.pushToast({
              message: err.message || "Error al desplegar contrato de alquiler en blockchain",
              severity: "error"
            });
          }
        },

        signContract: async (propertyId) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          const { rentalsService } = getServices(wallet);

          const property = get().ownedProperties.find((p) => p.id === propertyId);
          if (!property) return;

          const targetAgreement = property.agreementAddress || property.rentalToken;
          if (!targetAgreement) {
            userStore.pushToast({ message: "No hay contrato desplegado para firmar", severity: "error" });
            return;
          }

          try {
            userStore.pushToast({
              message: "Aprobando contrato de alquiler en blockchain...",
              severity: "info"
            });

            const result = await rentalsService.approveAgreement({
              agreementAddress: targetAgreement,
              isTenant: false
            });

            set((s) => ({
              ownedProperties: s.ownedProperties.map((p) =>
                p.id === propertyId
                  ? {
                    ...p,
                    contractStatus: "active",
                    tenantSince: new Date().toISOString().slice(0, 10),
                    nextChargeDate: "2026-08-01",
                  }
                  : p
              )
            }));

            await get().syncOwnedProperties();

            userStore.pushToast({
              message: "Contrato firmado exitosamente on-chain",
              severity: "success",
              txHash: result.txHash
            });
          } catch (err: any) {
            console.error("Failed to sign contract:", err);
            userStore.pushToast({
              message: err.message || "Error al firmar contrato en blockchain",
              severity: "error"
            });
          }
        },

        cancelContract: async (propertyId) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          const { rentalsService } = getServices(wallet);

          const property = get().ownedProperties.find((p) => p.id === propertyId);
          if (!property) return;

          const targetAgreement = property.agreementAddress || property.rentalToken;
          if (!targetAgreement) {
            userStore.pushToast({ message: "No hay contrato para cancelar", severity: "error" });
            return;
          }

          try {
            userStore.pushToast({
              message: "Cancelando contrato en blockchain...",
              severity: "info"
            });

            const result = await rentalsService.cancelAgreement(targetAgreement);

            set((s) => ({
              ownedProperties: s.ownedProperties.map((p) =>
                p.id === propertyId ? { ...p, contractStatus: "cancelled", tenant: null, nextChargeDate: undefined } : p
              )
            }));

            await get().syncOwnedProperties();

            userStore.pushToast({
              message: "Contrato cancelado cooperativamente on-chain",
              severity: "info",
              txHash: result.txHash
            });
          } catch (err: any) {
            console.error("Failed to cancel contract:", err);
            userStore.pushToast({
              message: err.message || "Error al cancelar contrato en blockchain",
              severity: "error"
            });
          }
        },

        importProperty: async (propertyId: number) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          try {
            userStore.pushToast({ message: "Verificando propiedad en la blockchain...", severity: "info" });

            await propertyDashboardService.verifyPropertyOwnership(wallet, propertyId);

            const currentImports = get().propertyImports || [];
            if (currentImports.includes(propertyId)) {
              userStore.pushToast({ message: "La propiedad ya está en tu lista", severity: "warning" });
              return;
            }

            set({ propertyImports: [...currentImports, propertyId] });
            await get().syncOwnedProperties();

            userStore.pushToast({ message: "Propiedad importada con éxito", severity: "success" });
          } catch (err: any) {
            console.error("Failed to import property:", err);
            userStore.pushToast({
              message: err.message || "Error al importar propiedad",
              severity: "error"
            });
          }
        },

        syncOwnedProperties: async () => {
          ownedPropertiesSyncVersion++;
          const currentVersion = ownedPropertiesSyncVersion;

          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) {
            if (currentVersion === ownedPropertiesSyncVersion) {
              set({ ownedProperties: [] });
            }
            return;
          }

          try {
            let imports = get().propertyImports || [];

            if (usesMockRepositories() && isWalletConnected(wallet) && imports.length === 0) {
              const demoId = ensureMockDemoProperty(wallet);
              imports = [demoId];
              set({ propertyImports: imports });
            }

            const existingProps = get().ownedProperties;
            const loadedProps = await loadOwnedProperties(wallet, imports, existingProps);

            if (currentVersion !== ownedPropertiesSyncVersion) {
              return;
            }

            set({ ownedProperties: loadedProps });
          } catch (error: any) {
            if (currentVersion !== ownedPropertiesSyncVersion) {
              return;
            }
            console.error("Failed to sync owned properties:", error);
            userStore.pushToast({
              message: "Error al sincronizar propiedades: " + (error.message || error.toString()),
              severity: "error"
            });
          }
        },

        updateSmartlock: (propertyId, updates) => {
          set((s) => ({
            ownedProperties: s.ownedProperties.map((p) =>
              p.id === propertyId ? { ...p, smartlock: { ...p.smartlock, ...updates } } : p
            )
          }));
        }
      };
    },
    {
      name: "properties-store-storage",
      partialize: (state) => ({ propertyImports: state.propertyImports || [] })
    }
  )
);

export type UsePropertiesStoreReturn = ReturnType<typeof usePropertiesStore>;
