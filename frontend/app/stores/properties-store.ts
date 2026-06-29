import { create } from "zustand";
import type { OwnedProperty, Rental, PaymentRecord } from "@models/types";
import { initialOwnedProperties, initialRentals } from "@models/mock-data";
import { useUserStore } from "./user-store";
import { PropertiesService } from "../lib/services/properties-service";
import { RentalsService } from "../lib/services/rentals-service";

const MOCK_WALLET_ADDRESS = "0x7A3f...91Cd";

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

const isMockWallet = (wallet: string) => wallet === MOCK_WALLET_ADDRESS || !wallet;

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
  mintAndLoadProperty: (input: AddPropertyInput) => Promise<void>;
  withdrawRent: (propertyId: string) => Promise<void>;
  payMonthlyRent: (rentalId: string, month: string) => Promise<void>;
  createContract: (propertyId: string, tenant: string, rent: number) => Promise<void>;
  signContract: (propertyId: string) => Promise<void>;
  cancelContract: (propertyId: string) => Promise<void>;
}

export const usePropertiesStore = create<PropertiesState>((set, get) => ({
  ownedProperties: initialOwnedProperties,
  rentals: initialRentals,

  mintAndLoadProperty: async (input) => {
    const userStore = useUserStore.getState();
    const wallet = userStore.wallet;

    if (isMockWallet(wallet)) {
      // Mock flow
      const tx = fakeTx();
      const newProp: OwnedProperty = {
        id: `own-${Date.now()}`,
        name: input.name,
        type: input.type,
        address: input.address,
        imageUrl: "/images/prop-5.png",
        propertyId: BigInt(Date.now()),
        realEstateToken: input.realEstateToken,
        rentalToken: input.rentalToken,
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
        txHash: tx,
      });
      return;
    }

    // Real on-chain flow
    try {
      userStore.pushToast({
        message: "Minteando NFT de Propiedad en la blockchain...",
        severity: "info"
      });

      const result = await PropertiesService.mintProperty(wallet, `ipfs://property-metadata-${Date.now()}`);
      
      const newProp: OwnedProperty = {
        id: `own-${Date.now()}`,
        name: input.name,
        type: input.type,
        address: input.address,
        imageUrl: "/images/prop-5.png",
        propertyId: BigInt(Date.now()),
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

    const property = get().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;

    // Use agreementAddress if present, else fallback to rentalToken
    const targetAgreement = property.agreementAddress || property.rentalToken;

    if (isMockWallet(wallet) || !targetAgreement) {
      // Mock flow
      let message = "";
      let tx = "";
      let addedBalance = 0;
      set((state) => {
        const updated = state.ownedProperties.map((p) => {
          if (p.id !== propertyId) return p;
          if (p.availableToWithdraw <= 0) return p;
          addedBalance = p.availableToWithdraw;
          tx = fakeTx();
          message = `Retiraste ${p.availableToWithdraw} USDC de "${p.name}"`;
          return { ...p, availableToWithdraw: 0 };
        });
        return {
          ownedProperties: updated,
        };
      });
      if (addedBalance > 0) {
        userStore.adjustBalance(addedBalance);
      }
      if (message) {
        userStore.pushToast({ message, severity: "success", txHash: tx });
      }
      return;
    }

    // Real on-chain flow
    try {
      userStore.pushToast({
        message: "Retirando USDC acumulados de la blockchain...",
        severity: "info"
      });

      const result = await RentalsService.withdrawRent(targetAgreement);
      
      set((state) => ({
        ownedProperties: state.ownedProperties.map((p) =>
          p.id === propertyId ? { ...p, availableToWithdraw: 0 } : p
        )
      }));

      // Sync wallet balance
      await userStore.syncOnchainBalance();

      userStore.pushToast({
        message: `Retiro exitoso de ${property.availableToWithdraw} USDC de "${property.name}"`,
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

    const r = get().rentals.find((x) => x.id === rentalId);
    if (!r) return;

    const already = r.payments.find((p) => p.month === month && p.status === "paid");
    if (already) {
      userStore.pushToast({ message: `El mes ${month} ya estaba pagado`, severity: "warning" });
      return;
    }

    // Must use real agreementAddress for Web3 flow
    const targetAgreement = r.agreementAddress;

    if (isMockWallet(wallet) || !targetAgreement) {
      // Mock flow
      const balance = userStore.balance;
      if (balance < r.monthlyRent) {
        userStore.pushToast({ message: "Saldo USDC insuficiente", severity: "error" });
        return;
      }

      const tx = fakeTx();
      const record: PaymentRecord = {
        month,
        amount: r.monthlyRent,
        status: "paid",
        paidAt: new Date().toISOString(),
        txHash: tx,
      };

      userStore.adjustBalance(-r.monthlyRent);
      set((s) => ({
        rentals: s.rentals.map((item) => {
          if (item.id !== rentalId) return item;
          const others = item.payments.filter((p) => p.month !== month);
          return {
            ...item,
            payments: [record, ...others].sort((a, b) => b.month.localeCompare(a.month))
          };
        })
      }));

      userStore.pushToast({
        message: `Pagaste ${r.monthlyRent} USDC — ${r.name} (${month})`,
        severity: "success",
        txHash: tx,
      });
      return;
    }

    // Real on-chain flow
    try {
      userStore.pushToast({
        message: "Enviando pago de alquiler a la blockchain...",
        severity: "info"
      });

      const result = await RentalsService.payRent(targetAgreement, r.monthlyRent);

      const record: PaymentRecord = {
        month,
        amount: r.monthlyRent,
        status: "paid",
        paidAt: new Date().toISOString(),
        txHash: result.txHash,
      };

      set((s) => ({
        rentals: s.rentals.map((item) => {
          if (item.id !== rentalId) return item;
          const others = item.payments.filter((p) => p.month !== month);
          return {
            ...item,
            payments: [record, ...others].sort((a, b) => b.month.localeCompare(a.month))
          };
        })
      }));

      await userStore.syncOnchainBalance();

      userStore.pushToast({
        message: `Pagaste ${r.monthlyRent} USDC — ${r.name} (${month})`,
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

    const property = get().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;

    if (isMockWallet(wallet)) {
      // Mock flow
      set((s) => ({
        ownedProperties: s.ownedProperties.map((p) =>
          p.id === propertyId ? { ...p, contractStatus: "draft", tenant, monthlyRent: rent } : p
        )
      }));
      userStore.pushToast({ message: "Contrato de alquiler creado (borrador on-chain)", severity: "info", txHash: fakeTx() });
      return;
    }

    // Real on-chain flow using dynamic property.propertyId
    try {
      userStore.pushToast({
        message: "Desplegando contrato de alquiler en blockchain...",
        severity: "info"
      });

      const dynamicPropertyId = property.propertyId || 1n;
      const oneDaySeconds = 24 * 60 * 60;
      const thirtyDaysSeconds = 30 * oneDaySeconds;
      
      const result = await RentalsService.createRental({
        propertyId: dynamicPropertyId,
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

    const property = get().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;

    // Use agreementAddress if present, else fallback to rentalToken
    const targetAgreement = property.agreementAddress || property.rentalToken;

    if (isMockWallet(wallet) || !targetAgreement) {
      // Mock flow
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
      userStore.pushToast({ message: "Contrato firmado y activado", severity: "success", txHash: fakeTx() });
      return;
    }

    // Real on-chain flow
    try {
      userStore.pushToast({
        message: "Aprobando contrato de alquiler en blockchain...",
        severity: "info"
      });

      const result = await RentalsService.approveAgreement({
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

    const property = get().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;

    const targetAgreement = property.agreementAddress || property.rentalToken;

    if (isMockWallet(wallet) || !targetAgreement) {
      // Mock flow
      set((s) => ({
        ownedProperties: s.ownedProperties.map((p) =>
          p.id === propertyId ? { ...p, contractStatus: "cancelled", tenant: null, nextChargeDate: undefined } : p
        )
      }));
      userStore.pushToast({ message: "Contrato cancelado cooperativamente", severity: "info", txHash: fakeTx() });
      return;
    }

    // Real on-chain flow
    try {
      userStore.pushToast({
        message: "Cancelando contrato en blockchain...",
        severity: "info"
      });

      const result = await RentalsService.cancelAgreement(targetAgreement);

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
  }
}));

export type UsePropertiesStoreReturn = ReturnType<typeof usePropertiesStore>;
