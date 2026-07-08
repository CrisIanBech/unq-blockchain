import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Property, PropertyImport, AddPropertyInput, CreateContractInput } from "@models/types";
import { useUserStore } from "./user-store";
import { getServices } from "@/lib/services/service-registry";

export type { AddPropertyInput, CreateContractInput };

interface PropertiesState {
  isSyncing: boolean;
  ownedProperties: Property[];
  propertyImports: PropertyImport[];
  customContracts: Record<number, string>;
  contractHistory: Record<number, string[]>;
  importProperty: (name: string, propertyId: number) => Promise<void>;
  syncProperties: () => Promise<void>;
  syncProperty: (propertyId: string) => Promise<void>;
  mintAndLoadProperty: (input: AddPropertyInput) => Promise<void>;
  withdrawRent: (propertyId: string) => Promise<void>;
  signContract: (propertyId: string) => Promise<void>;
  cancelContract: (propertyId: string) => Promise<void>;
  createContract: (propertyId: string, input: Omit<CreateContractInput, "propertyId">) => Promise<void>;
  linkContract: (propertyId: number, agreementAddress: string) => void;
  unlinkContract: (propertyId: number) => void;
  releaseDeposit: (agreementAddress: string) => Promise<void>;
  claimDeposit: (agreementAddress: string, amount: number, reason: string) => Promise<void>;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => {
      return {
        isSyncing: false,
        ownedProperties: [],
        propertyImports: [],
        customContracts: {},
        contractHistory: {},

        mintAndLoadProperty: async (input: AddPropertyInput) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Creando propiedad...", severity: "info" });
            const { propertiesService } = getServices();
            const result = await propertiesService.mintProperty(wallet, input.tokenURI, input.latitude, input.longitude);

            if (result.tokenId !== undefined) {
              const currentImports = get().propertyImports || [];
              if (!currentImports.some((i) => i.id === result.tokenId)) {
                const newImport = { id: result.tokenId, name: input.name };
                const prop = await propertiesService.fetchProperty(newImport);
                
                set({
                  propertyImports: [...currentImports, newImport],
                  ownedProperties: [...get().ownedProperties, prop]
                });
              }
              userStore.pushToast({ id: toastId, message: "Propiedad creada exitosamente", severity: "success" });
            } else {
              throw new Error("No se pudo obtener el ID de la propiedad creada.");
            }
          } catch (error: any) {
            console.error("Error al crear propiedad:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al crear propiedad", severity: "error" });
          }
        },

        withdrawRent: async (propertyId: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Retirando renta...", severity: "info" });
            const prop = get().ownedProperties.find(p => p.id === String(propertyId));
            const agreementAddress = prop?.rental?.currentContract?.agreementAddress;
            if (!agreementAddress) throw new Error("No hay contrato activo para esta propiedad.");

            const { propertiesService } = getServices();
            await propertiesService.withdrawRent(agreementAddress);
            userStore.pushToast({ id: toastId, message: "Renta retirada exitosamente", severity: "success" });
            await userStore.syncOnchainBalance();
            await get().syncProperty(propertyId);
          } catch (error: any) {
            console.error("Error al retirar renta:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al retirar renta", severity: "error" });
          }
        },

        signContract: async (propertyId: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Firmando contrato...", severity: "info" });
            const prop = get().ownedProperties.find(p => p.id === String(propertyId));
            const agreementAddress = prop?.rental?.currentContract?.agreementAddress;
            if (!agreementAddress) throw new Error("No hay contrato activo para esta propiedad.");

            const { propertiesService } = getServices();
            await propertiesService.approveAgreement({ agreementAddress, isTenant: false });
            await get().syncProperty(propertyId);
            userStore.pushToast({ id: toastId, message: "Contrato firmado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al firmar contrato:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al firmar contrato", severity: "error" });
          }
        },

        cancelContract: async (propertyId: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Cancelando contrato...", severity: "info" });
            const prop = get().ownedProperties.find(p => p.id === String(propertyId));
            const agreementAddress = prop?.rental?.currentContract?.agreementAddress;
            if (!agreementAddress) throw new Error("No hay contrato activo para esta propiedad.");

            const { propertiesService } = getServices();
            await propertiesService.cancelAgreement(agreementAddress);
            await get().syncProperty(propertyId);
            userStore.pushToast({ id: toastId, message: "Contrato cancelado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al cancelar contrato:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al cancelar contrato", severity: "error" });
          }
        },

        linkContract: (propertyId: number, agreementAddress: string) => {
          set((state) => ({
            customContracts: { ...state.customContracts, [propertyId]: agreementAddress }
          }));
        },

        createContract: async (propertyId: string, input: Omit<CreateContractInput, "propertyId">) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Creando contrato...", severity: "info" });
            const { propertiesService } = getServices();
            
            const SECONDS_PER_DAY = 24 * 60 * 60;
            const params = {
              propertyId: BigInt(propertyId),
              tenant: input.tenant,
              baseRent: input.baseRent,
              securityDeposit: input.securityDeposit,
              duration: input.durationMonths * 30 * SECONDS_PER_DAY,
              gracePeriod: input.gracePeriodDays * SECONDS_PER_DAY,
              paymentPeriod: input.paymentPeriodDays * SECONDS_PER_DAY,
              deadline: Math.floor(Date.now() / 1000) + (input.deadlineDays * SECONDS_PER_DAY),
              inflationBps: input.inflationBps,
              lateFeeBps: input.lateFeeBps,
              inflationAdjustmentInterval: input.inflationAdjustmentInterval * 30 * SECONDS_PER_DAY
            };
            
            const result = await propertiesService.createRental(params);
            
            get().linkContract(Number(propertyId), result.agreementAddress);
            await get().syncProperty(propertyId);
            
            userStore.pushToast({ id: toastId, message: "Contrato creado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al crear contrato:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al crear contrato", severity: "error" });
          }
        },

        unlinkContract: (propertyId: number) => {
          const currentCustom = { ...get().customContracts };
          delete currentCustom[propertyId];
          set({ customContracts: currentCustom });
        },

        releaseDeposit: async (agreementAddress: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Liberando depósito...", severity: "info" });
            const { propertiesService } = getServices();
            await propertiesService.releaseDeposit(agreementAddress);

            const prop = get().ownedProperties.find(p => p.rental?.currentContract?.agreementAddress?.toLowerCase() === agreementAddress.toLowerCase() || p.rental?.rentalNFTAddress?.toLowerCase() === agreementAddress.toLowerCase());
            if (prop) {
              await get().syncProperty(prop.id);
            }
            userStore.pushToast({ id: toastId, message: "Depósito liberado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al liberar depósito:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al liberar depósito", severity: "error" });
          }
        },

        claimDeposit: async (agreementAddress: string, amount: number, reason: string) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Reclamando depósito...", severity: "info" });
            const { propertiesService } = getServices();
            await propertiesService.claimDeposit(agreementAddress, amount, reason);
            await userStore.syncOnchainBalance();

            const prop = get().ownedProperties.find(p => p.rental?.currentContract?.agreementAddress?.toLowerCase() === agreementAddress.toLowerCase() || p.rental?.rentalNFTAddress?.toLowerCase() === agreementAddress.toLowerCase());
            if (prop) {
              await get().syncProperty(prop.id);
            }
            userStore.pushToast({ id: toastId, message: "Depósito reclamado exitosamente", severity: "success" });
          } catch (error: any) {
            console.error("Error al reclamar depósito:", error);
            userStore.pushToast({ id: toastId, message: error.message || "Error al reclamar depósito", severity: "error" });
          }
        },

        importProperty: async (name: string, propertyId: number) => {
          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) return;

          let toastId: number | undefined;
          try {
            toastId = userStore.pushToast({ message: "Verificando propiedad en la blockchain...", severity: "info" });

            const currentImports = get().propertyImports || [];
            if (currentImports.some((i) => i.id === propertyId)) {
              userStore.pushToast({ id: toastId, message: "La propiedad ya está en tu lista", severity: "warning" });
              return;
            }

            const { propertiesService } = getServices();
            const customContract = get().customContracts[propertyId];
            const prop = await propertiesService.fetchProperty({ id: propertyId, name }, customContract);

            set({
              propertyImports: [...currentImports, { id: propertyId, name }],
              ownedProperties: [...get().ownedProperties, prop]
            });

            userStore.pushToast({ id: toastId, message: "Propiedad importada con éxito", severity: "success" });
          } catch (err: any) {
            console.error("Failed to import property:", err);
            userStore.pushToast({
              id: toastId,
              message: err.message || "Error al importar propiedad",
              severity: "error"
            });
          }
        },

        syncProperties: async () => {
          set({ isSyncing: true });

          const userStore = useUserStore.getState();
          const wallet = userStore.wallet;
          if (!wallet) {
            set({ ownedProperties: [], isSyncing: false });
            return;
          }

          try {
            const rawImports = get().propertyImports || [];
            const imports = rawImports.filter(imp => imp && imp.id !== undefined && imp.id !== null);

            const { propertiesService } = getServices();
            const propertyPromises = imports.map(async (imp) => {
              try {
                const customContract = get().customContracts[imp.id];
                return await propertiesService.fetchProperty(imp, customContract);
              } catch (e: any) {
                console.warn(`Error fetching property ${imp.name}:`, e);
                userStore.pushToast({
                  message: `No se pudo cargar la propiedad: ${imp.name}`,
                  severity: "warning"
                });
                return null;
              }
            });

            const results = await Promise.all(propertyPromises);
            const loadedProps: Property[] = results.filter((p: Property | null): p is Property => p !== null);

            set({ ownedProperties: loadedProps, isSyncing: false });
          } catch (error: any) {
            set({ isSyncing: false });
            console.error("Failed to sync properties:", error);
            userStore.pushToast({
              message: "Error al sincronizar propiedades: " + (error.message || error.toString()),
              severity: "error"
            });
          }
        },

        syncProperty: async (propertyId: string) => {
          const state = get();
          const prop = state.ownedProperties.find(p => p.id === String(propertyId));

          if (!prop) return; // Si la propiedad no está cargada actualmente, no hacemos nada

          const imp = state.propertyImports.find(i => String(i.id) === prop.id);
          if (!imp) return;

          try {
            const { propertiesService } = getServices();
            const customContract = state.customContracts[imp.id];
            const updatedProp = await propertiesService.fetchProperty(imp, customContract);
            set((s) => ({
              ownedProperties: s.ownedProperties.map(p => p.id === prop.id ? updatedProp : p)
            }));
          } catch (e: any) {
            console.error(`Failed to sync property ${propertyId}:`, e);
          }
        },
      };
    },
    {
      name: "properties-store-storage",
      partialize: (state) => ({
        propertyImports: state.propertyImports || [],
        customContracts: state.customContracts || {}
      })
    }
  )
);

export type UsePropertiesStoreReturn = ReturnType<typeof usePropertiesStore>;
