import { create } from "zustand";
import type { OwnedProperty, Rental, PaymentRecord } from "@models/types";
import { initialOwnedProperties, initialRentals } from "@models/mock-data";
import { useUserStore } from "./user-store";
import { BlockchainService } from "../lib/services/blockchain-service";

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
        message: "Minteando NFT de Propiedad en blockchain...",
        severity: "info"
      });

      const receipt = await BlockchainService.mintPropertyNFT(wallet, `ipfs://property-metadata-${Date.now()}`);
      
      const newProp: OwnedProperty = {
        id: `own-${Date.now()}`,
        name: input.name,
        type: input.type,
        address: input.address,
        imageUrl: "/images/prop-5.png",
        realEstateToken: receipt.contractAddress || input.realEstateToken,
        rentalToken: "",
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
        txHash: receipt.hash,
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

    if (isMockWallet(wallet) || !property.rentalToken) {
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

      const txHash = await BlockchainService.withdrawRent(property.rentalToken);
      
      // Update local state available to withdraw
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
        txHash
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

    if (isMockWallet(wallet)) {
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

      // Use rental ID as the agreement address for direct blockchain interaction
      const txHash = await BlockchainService.payMonthlyRent(rentalId, r.monthlyRent);

      const record: PaymentRecord = {
        month,
        amount: r.monthlyRent,
        status: "paid",
        paidAt: new Date().toISOString(),
        txHash,
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

      // Sync user on-chain balance
      await userStore.syncOnchainBalance();

      userStore.pushToast({
        message: `Pagaste ${r.monthlyRent} USDC — ${r.name} (${month})`,
        severity: "success",
        txHash,
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

    // Real on-chain flow
    try {
      userStore.pushToast({
        message: "Desplegando contrato de alquiler en blockchain...",
        severity: "info"
      });

      // Standard lease configuration parameters
      const oneDaySeconds = 24 * 60 * 60;
      const thirtyDaysSeconds = 30 * oneDaySeconds;
      
      const { agreementAddress, txHash } = await BlockchainService.createRentalAgreement({
        propertyId: 1, // Using first property ID for demonstration
        tenant,
        baseRent: rent,
        securityDeposit: rent * 2, // Deposit is 2x monthly rent by default
        inflationBps: 500, // 5% period inflation
        lateFeeBps: 100, // 1% late fee
        gracePeriod: 5 * oneDaySeconds, // 5 days grace period
        duration: 12 * thirtyDaysSeconds, // 12 periods
        deadline: Math.floor(Date.now() / 1000) + 7 * oneDaySeconds // 7 days deadline
      });

      set((s) => ({
        ownedProperties: s.ownedProperties.map((p) =>
          p.id === propertyId ? { ...p, contractStatus: "draft", tenant, monthlyRent: rent, rentalToken: agreementAddress } : p
        )
      }));

      userStore.pushToast({
        message: `Contrato de alquiler creado en ${agreementAddress}`,
        severity: "success",
        txHash
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

    if (isMockWallet(wallet) || !property.rentalToken) {
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

      // Owner signing contract (isTenant = false)
      const txHash = await BlockchainService.approveRentalAgreement({
        agreementAddress: property.rentalToken,
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
        txHash
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

    if (isMockWallet(wallet) || !property.rentalToken) {
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

      const txHash = await BlockchainService.cancelRentalAgreement(property.rentalToken);

      set((s) => ({
        ownedProperties: s.ownedProperties.map((p) =>
          p.id === propertyId ? { ...p, contractStatus: "cancelled", tenant: null, nextChargeDate: undefined } : p
        )
      }));

      userStore.pushToast({
        message: "Contrato cancelado cooperativamente on-chain",
        severity: "info",
        txHash
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
