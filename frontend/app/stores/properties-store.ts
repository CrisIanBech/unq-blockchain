import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OwnedProperty, Rental, PaymentRecord, PropertyType } from "@models/types";
import { initialOwnedProperties } from "@models/mock-data";
import { useUserStore } from "./user-store";
import { PropertiesRepository } from "../lib/repositories/properties-repository";
import { MockPropertiesRepository } from "../lib/repositories/mock-properties-repository";
import { RentalsRepository } from "../lib/repositories/rentals-repository";
import { MockRentalsRepository } from "../lib/repositories/mock-rentals-repository";
import { PropertiesService } from "../lib/services/properties-service";
import { RentalsService } from "../lib/services/rentals-service";
import { GeocodingRepository } from "../lib/repositories/geocoding-repository";
import { MockGeocodingRepository } from "../lib/repositories/mock-geocoding-repository";

const isMock = import.meta.env.VITE_USE_MOCKS === "true";

function getServices(wallet: string) {
  if (isMock) {
    return {
      propertiesService: new PropertiesService(new MockPropertiesRepository(), new MockGeocodingRepository()),
      rentalsService: new RentalsService(new MockRentalsRepository())
    };
  }

  return {
    propertiesService: new PropertiesService(new PropertiesRepository(), new GeocodingRepository()),
    rentalsService: new RentalsService(new RentalsRepository())
  };
}

export interface AddPropertyInput {
  name: string;
  type: "departamento" | "casa" | "ph" | "local" | "oficina";
  address: string;
  monthlyRent: number;
  realEstateToken: string;
  rentalToken: string;
}

interface PropertiesState {
  ownedProperties: OwnedProperty[];
  rentals: Rental[];
  rentalImports: { name: string, address: string }[];
  mintAndLoadProperty: (input: AddPropertyInput) => Promise<void>;
  withdrawRent: (propertyId: string) => Promise<void>;
  payMonthlyRent: (rentalId: string, month: string) => Promise<void>;
  createContract: (propertyId: string, tenant: string, rent: number) => Promise<void>;
  signContract: (propertyId: string) => Promise<void>;
  cancelContract: (propertyId: string) => Promise<void>;
  importRental: (name: string, agreementAddress: string) => Promise<void>;
  syncRentals: () => Promise<void>;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => ({
      ownedProperties: initialOwnedProperties,
      rentals: [],
      rentalImports: [],

      mintAndLoadProperty: async (input) => {
        const userStore = useUserStore.getState();
        const wallet = userStore.wallet;
        const { propertiesService } = getServices(wallet);

        try {
          userStore.pushToast({
            message: "Minteando NFT de Propiedad en la blockchain...",
            severity: "info"
          });

          const result = await propertiesService.mintProperty(wallet, `ipfs://property-metadata-${Date.now()}`);

          const newProp: OwnedProperty = {
            id: `own-${Date.now()}`,
            name: input.name,
            type: input.type,
            address: input.address,
            imageUrl: "/images/prop-5.png",
            propertyId: Date.now(),
            realEstateToken: result.contractAddress || input.realEstateToken,
            rentalToken: "",
            agreementAddress: undefined,
            monthlyRent: input.monthlyRent,
            tenant: null,
            availableToWithdraw: 0,
            contractStatus: "draft",
            smartlock: { id: `lock-${Date.now()}`, installed: false, nfcEnabled: false, unlocked: false },
            payments: [],
          };

          set((state) => ({
            ownedProperties: [newProp, ...state.ownedProperties]
          }));

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

      payMonthlyRent: async (rentalId, month) => {
        const userStore = useUserStore.getState();
        const wallet = userStore.wallet;
        const { rentalsService } = getServices(wallet);

        const r = get().rentals.find((x) => x.id === rentalId);
        if (!r) return;

        const already = r.payments.find((p) => p.month === month && p.status === "paid");
        if (already) {
          userStore.pushToast({ message: `El periodo ya estaba pagado`, severity: "warning" });
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
          const result = await rentalsService.payRent(targetAgreement, amountToPay);

          // Refetch history from service instead of manual push
          const updatedHistory = await rentalsService.getPaymentHistory(targetAgreement);
          const newPayments = updatedHistory.map((e, i) => ({
            month: month + i.toString(), // Mock mapping just to fulfill type
            amount: e.amount,
            status: "paid" as const,
            paidAt: new Date().toISOString(),
            txHash: e.txHash
          }));

          set((s) => ({
            rentals: s.rentals.map((item) => {
              if (item.id !== rentalId) return item;
              // Keep old mocked array and prepend the new one
              return {
                ...item,
                payments: [...newPayments, ...item.payments].slice(0, Math.max(newPayments.length, item.payments.length))
              };
            })
          }));

          if (!isMock) {
            await userStore.syncOnchainBalance();
          } else {
            userStore.adjustBalance(-amountToPay);
          }

          userStore.pushToast({
            message: `Pago procesado con éxito`,
            severity: "success",
            txHash: result.txHash,
          });
        } catch (err: any) {
          console.error("Failed to pay monthly rent:", err);
          userStore.pushToast({
            message: err.message || "Error al procesar pago de alquiler en la blockchain",
            severity: "error"
          });
        }
      },

      createContract: async (propertyId, tenant, rent) => {
        const userStore = useUserStore.getState();
        const wallet = userStore.wallet;
        const { rentalsService } = getServices(wallet);

        const property = get().ownedProperties.find((p) => p.id === propertyId);
        if (!property) return;

        try {
          userStore.pushToast({
            message: "Desplegando contrato de alquiler en blockchain...",
            severity: "info"
          });

          const dynamicPropertyId = property.propertyId || 1;
          const oneDaySeconds = 24 * 60 * 60;
          const thirtyDaysSeconds = 30 * oneDaySeconds;

          const result = await rentalsService.createRental({
            propertyId: BigInt(dynamicPropertyId),
            tenant,
            baseRent: rent,
            securityDeposit: rent * 2,
            inflationBps: 500,
            lateFeeBps: 100,
            gracePeriod: 5 * oneDaySeconds,
            duration: 12 * thirtyDaysSeconds,
            deadline: Math.floor(Date.now() / 1000) + 7 * oneDaySeconds
          });

          set((s) => ({
            ownedProperties: s.ownedProperties.map((p) =>
              p.id === propertyId ? { ...p, contractStatus: "draft", tenant, monthlyRent: rent, agreementAddress: result.agreementAddress } : p
            )
          }));

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
      importRental: async (name: string, agreementAddress: string) => {
        const userStore = useUserStore.getState();
        const imports = get().rentalImports;

        if (imports.find(r => r.address === agreementAddress)) {
          userStore.pushToast({ message: "El alquiler ya está cargado", severity: "warning" });
          return;
        }

        // Add address and trigger sync
        set({ rentalImports: [{ name, address: agreementAddress }, ...imports] });
        userStore.pushToast({ message: "Contrato añadido, sincronizando...", severity: "info" });

        await get().syncRentals();
      },

      syncRentals: async () => {
        const userStore = useUserStore.getState();
        const wallet = userStore.wallet;
        const { rentalsService, propertiesService } = getServices(wallet);
        const imports = get().rentalImports;

        try {
          const loadedRentals = await Promise.all(imports.map(async (rentalImport) => {
            const address = rentalImport.address;
            const details = await rentalsService.getRentalDetails(address);
            const metadata = await propertiesService.getPropertyMetadata(Number(details.propertyId));
            const amounts = await rentalsService.getRentAmountToPay(address);
            const history = await rentalsService.getPaymentHistory(address);

            const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
            const addrAttr = metadata.attributes?.find((a: any) => a.trait_type === "address")?.value || "Dirección desconocida";

            const payments: PaymentRecord[] = history.map((e, i) => ({
              month: "Period " + e.periodIndex,
              amount: e.amount,
              status: "paid" as const,
              txHash: e.txHash,
              paidAt: new Date().toISOString()
            }));

            const newRental: Rental = {
              id: address,
              agreementAddress: address,
              propertyId: Number(details.propertyId),
              name: rentalImport.name || metadata.name || `Propiedad #${details.propertyId.toString()}`,
              type: typeAttr as PropertyType,
              address: addrAttr,
              imageUrl: metadata.image || "/images/prop-placeholder.png",
              landlord: details.landlord,
              tenant: details.tenant,
              monthlyRent: Number(details.baseRent),
              payments,
              contractDetails: {
                baseRent: amounts.currentRent,
                securityDeposit: amounts.currentRent,
                inflationBps: 0,
                lateFeeBps: 1000,
                gracePeriod: 5 * 86400,
                paymentPeriod: 30 * 86400,
                duration: 12 * 30 * 86400,
                deadline: 0,
                startTime: Math.floor(Date.now() / 1000) - 2 * 30 * 86400,
                rentPaidUntil: details.rentPaidUntil,
                amountToPay: amounts.totalAmount,
                lateFeeAmount: amounts.lateFee,
                isLate: amounts.lateFee > 0
              }
            };

            return newRental;
          }));

          set({ rentals: loadedRentals });
        } catch (error: any) {
          console.error("Failed to sync rentals concurrently:", error);
          userStore.pushToast({ message: "Error al cargar alquileres: " + (error.message || error.toString()), severity: "error" });
        }
      }
    }),
    {
      name: "properties-store-storage", // local storage key
      partialize: (state) => ({ rentalImports: state.rentalImports, ownedProperties: state.ownedProperties }), // persist only rental imports and owned properties
    }
  ));

export type UsePropertiesStoreReturn = ReturnType<typeof usePropertiesStore>;
