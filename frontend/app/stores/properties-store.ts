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
import { CONTRACT_ADDRESSES } from "../lib/blockchain-infra";

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
  propertyImports: number[];
  mintAndLoadProperty: (input: AddPropertyInput) => Promise<void>;
  withdrawRent: (propertyId: string) => Promise<void>;
  payMonthlyRent: (rentalId: string, month: string) => Promise<void>;
  createContract: (propertyId: string, tenant: string, rent: number) => Promise<void>;
  signContract: (propertyId: string) => Promise<void>;
  cancelContract: (propertyId: string) => Promise<void>;
  importRental: (name: string, agreementAddress: string) => Promise<void>;
  importProperty: (propertyId: number) => Promise<void>;
  syncRentals: () => Promise<void>;
  syncOwnedProperties: () => Promise<void>;
}

export const usePropertiesStore = create<PropertiesState>()(
  persist(
    (set, get) => {
      let ownedPropertiesSyncVersion = 0;
      let rentalsSyncVersion = 0;

      return {
        ownedProperties: [],
      rentals: [],
      rentalImports: [],
      propertyImports: [],

      mintAndLoadProperty: async (input) => {
        const userStore = useUserStore.getState();
        const wallet = userStore.wallet;
        const { propertiesService } = getServices(wallet);

        try {
          userStore.pushToast({
            message: "Minteando NFT de Propiedad en la blockchain...",
            severity: "info"
          });

          // Construct base64 metadata URI to store name, address, rent and type on-chain
          const metadata = {
            name: input.name,
            description: `Tokenized property: ${input.name}`,
            image: `/images/prop-${Math.floor(Math.random() * 5) + 1}.png`,
            attributes: [
              { trait_type: "type", value: input.type },
              { trait_type: "address", value: input.address },
              { trait_type: "monthlyRent", value: input.monthlyRent }
            ]
          };
          const base64Metadata = btoa(unescape(encodeURIComponent(JSON.stringify(metadata))));
          const metadataURI = `data:application/json;base64,${base64Metadata}`;

          const result = await propertiesService.mintProperty(wallet, metadataURI);

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

          const syncPromise = get().syncRentals();

          if (!isMock) {
            await userStore.syncOnchainBalance();
          } else {
            userStore.adjustBalance(-amountToPay);
          }

          await syncPromise;

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

      importProperty: async (propertyId: number) => {
        const userStore = useUserStore.getState();
        const wallet = userStore.wallet;
        if (!wallet) return;

        const { propertiesService } = getServices(wallet);
        
        try {
          userStore.pushToast({ message: "Verificando propiedad en la blockchain...", severity: "info" });
          
          // Verify owner of the property NFT
          const owner = await propertiesService.getPropertyOwner(propertyId);
          if (owner.toLowerCase() !== wallet.toLowerCase()) {
            throw new Error("No eres el propietario de este Token ID.");
          }

          // Add to imports if not already there
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

      syncRentals: async () => {
        rentalsSyncVersion++;
        const currentVersion = rentalsSyncVersion;

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

            const payments: PaymentRecord[] = history.map((e) => {
              const payDate = new Date((Number(details.startTime) + e.periodIndex * 30 * 24 * 60 * 60) * 1000);
              return {
                month: `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, "0")}`,
                amount: e.amount,
                status: "paid" as const,
                txHash: e.txHash,
                paidAt: payDate.toISOString()
              };
            });

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

          if (currentVersion !== rentalsSyncVersion) {
            return;
          }

          set({ rentals: loadedRentals });
        } catch (error: any) {
          if (currentVersion !== rentalsSyncVersion) {
            return;
          }
          console.error("Failed to sync rentals concurrently:", error);
          userStore.pushToast({ message: "Error al cargar alquileres: " + (error.message || error.toString()), severity: "error" });
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

        const { propertiesService, rentalsService } = getServices(wallet);

        try {
          // 1. Get base owned properties from imported property IDs on-chain
          const imports = get().propertyImports || [];
          
          const allProps = await Promise.all(imports.map(async (tokenId) => {
            try {
              const metadata = await propertiesService.getPropertyMetadata(tokenId);
              
              const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
              const addrAttr = metadata.attributes?.find((a: any) => a.trait_type === "address")?.value || metadata.address || "Dirección desconocida";
              const rentAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "monthlyRent")?.value || metadata.monthlyRent || 0);

              return {
                propertyId: tokenId,
                name: metadata.name || `Propiedad #${tokenId}`,
                type: typeAttr,
                address: addrAttr,
                imageUrl: metadata.image || `/images/prop-${(tokenId % 5) + 1}.png`,
                monthlyRent: rentAttr,
              };
            } catch (err) {
              console.error(`Failed to fetch metadata for token ${tokenId}`, err);
              return {
                propertyId: tokenId,
                name: `Propiedad #${tokenId}`,
                type: "departamento" as const,
                address: "Dirección no disponible",
                imageUrl: `/images/prop-${(tokenId % 5) + 1}.png`,
                monthlyRent: 0,
              };
            }
          }));

          // Filter out properties that are no longer owned by this wallet
          const baseProps: typeof allProps = [];
          for (const baseProp of allProps) {
            try {
              const owner = await propertiesService.getPropertyOwner(baseProp.propertyId);
              if (owner.toLowerCase() === wallet.toLowerCase()) {
                baseProps.push(baseProp);
              }
            } catch (err) {
              // Skip if owner check fails (e.g. token burned or node reset)
            }
          }

          // 2. Fetch rental details and status for each property
          const loadedProps = await Promise.all(baseProps.map(async (baseProp) => {
            const tokenId = baseProp.propertyId;
            const agreementAddress = await rentalsService.getRentalAgreementForProperty(tokenId);
            
            let tenant: string | null = null;
            let availableToWithdraw = 0;
            let contractStatus: "draft" | "active" | "cancelled" = "draft";
            let tenantSince: string | undefined = undefined;
            let nextChargeDate: string | undefined = undefined;
            let payments: PaymentRecord[] = [];
            let monthlyRent = baseProp.monthlyRent;

            if (agreementAddress) {
              const details = await rentalsService.getRentalDetails(agreementAddress);
              const statusNum = details.status;
              
              if (statusNum === 2 /* Active */) {
                contractStatus = "active";
                tenant = details.tenant;
                tenantSince = new Date(Number(details.startTime) * 1000).toISOString().slice(0, 10);
                nextChargeDate = new Date(Number(details.rentPaidUntil) * 1000).toISOString().slice(0, 10);
                monthlyRent = details.baseRent;
              } else if (statusNum === 0 || statusNum === 1) {
                contractStatus = "draft";
                tenant = details.tenant;
                monthlyRent = details.baseRent;
              } else {
                contractStatus = "cancelled";
                tenant = null;
              }

              // Fetch USDC retirable balance
              availableToWithdraw = await rentalsService.getWithdrawableRent(agreementAddress);

              // Fetch past payment records
              const history = await rentalsService.getPaymentHistory(agreementAddress);
              payments = history.map((e) => {
                const payDate = new Date((Number(details.startTime) + e.periodIndex * 30 * 24 * 60 * 60) * 1000);
                return {
                  month: `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, "0")}`,
                  amount: e.amount,
                  status: "paid" as const,
                  paidAt: payDate.toISOString(),
                  txHash: e.txHash
                };
              });

              // Synthesize pending/overdue rent
              const nowSec = Math.floor(Date.now() / 1000);
              const nextPaymentDue = Number(details.rentPaidUntil);
              if (nowSec > nextPaymentDue && statusNum === 2 /* Active */) {
                const isLate = nowSec > nextPaymentDue + 5 * 24 * 60 * 60; // 5 days grace period
                const nextPeriodDate = new Date(nextPaymentDue * 1000);
                payments.unshift({
                  month: `${nextPeriodDate.getFullYear()}-${String(nextPeriodDate.getMonth() + 1).padStart(2, "0")}`,
                  amount: details.baseRent,
                  status: isLate ? "overdue" as const : "pending" as const
                });
              }
            }

            // Preserve current local smartlock status to prevent UI lock loss
            const existingProp = get().ownedProperties.find((p) => p.propertyId === tokenId);
            const smartlock = existingProp?.smartlock || {
              id: `lock-${tokenId}`,
              installed: false,
              nfcEnabled: false,
              unlocked: false
            };

            const ownedProp: OwnedProperty = {
              id: `own-${tokenId}`,
              propertyId: tokenId,
              name: baseProp.name,
              type: baseProp.type,
              address: baseProp.address,
              imageUrl: baseProp.imageUrl,
              realEstateToken: CONTRACT_ADDRESSES.propertyNft,
              rentalToken: "",
              agreementAddress: agreementAddress || undefined,
              monthlyRent,
              tenant,
              tenantSince,
              nextChargeDate,
              payments,
              availableToWithdraw,
              smartlock,
              contractStatus,
            };

            return ownedProp;
          }));

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
    };
  },
    {
      name: "properties-store-storage", // local storage key
      partialize: (state) => ({ rentalImports: state.rentalImports, propertyImports: state.propertyImports || [] }), // persist only rental imports and property imports
    }
  ));

export type UsePropertiesStoreReturn = ReturnType<typeof usePropertiesStore>;
