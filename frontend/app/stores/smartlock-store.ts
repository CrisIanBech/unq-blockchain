import { create } from "zustand";
import { decodeChallengePayload, lockIdFromPropertyId } from "@shared/smartlock-protocol/index";
import { SmartlockService } from "@/lib/services/smartlock-service";
import { isSmartlockMockMode } from "@/lib/smartlock/config";
import { WalletService } from "@/lib/services/wallet-service";
import { useRentalsStore } from "./rentals-store";
import { usePropertiesStore } from "./properties-store";
import { useUserStore } from "./user-store";

interface SmartlockState {
  isUnlocking: boolean;
  installSmartlock: (propertyId: string) => void;
  toggleNfc: (propertyId: string) => void;
  setLockOpen: (propertyId: string, open: boolean) => void;
  openTenantLock: (rentalId: string) => Promise<void>;
  unlockLandlordLock: (propertyId: string) => Promise<void>;
  toggleTenantNfc: (rentalId: string) => void;
}

async function runUnlock(params: {
  propertyId: bigint;
  agreementAddress?: string;
  expectedRole: "landlord" | "tenant";
  onSuccess: () => void;
  successMessage: string;
}) {
  useSmartlockStore.setState({ isUnlocking: true });

  try {
    const chainId = (await WalletService.getChainId()) ?? 11155111;
    const lockId = lockIdFromPropertyId(params.propertyId.toString());
    const demoChallenge = SmartlockService.createDemoChallenge(
      params.propertyId,
      lockId,
      chainId
    );

    const result = await SmartlockService.unlockFromNfc({
      propertyId: params.propertyId,
      agreementAddress: params.agreementAddress,
      demoChallenge,
      expectedRole: params.expectedRole,
    });

    if (!result.authorized) {
      useUserStore.getState().pushToast({
        message: "No tenés permiso para abrir esta cerradura. Verificá que seas el dueño o inquilino activo.",
        severity: "error",
      });
      return;
    }

    params.onSuccess();
    const roleLabel = result.role === "landlord" ? "propietario" : "inquilino";
    const fallbackNote = result.usedDemoFallback ? " (desafío demo — Web NFC no disponible en HTTP)" : "";
    useUserStore.getState().pushToast({
      message: `${params.successMessage} — verificado como ${roleLabel} (${result.signerAddress.slice(0, 6)}…${result.signerAddress.slice(-4)})${fallbackNote}`,
      severity: "success",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al desbloquear la cerradura";
    useUserStore.getState().pushToast({ message, severity: "error" });
  } finally {
    useSmartlockStore.setState({ isUnlocking: false });
  }
}

export const useSmartlockStore = create<SmartlockState>(() => ({
  isUnlocking: false,

  installSmartlock: (propertyId) => {
    usePropertiesStore.getState().updateSmartlock(propertyId, { installed: true });
    useUserStore.getState().pushToast({
      message: "Cerradura virtual colocada. Lista para desafíos NFC.",
      severity: "success",
    });
  },

  toggleNfc: (propertyId) => {
    const property = usePropertiesStore.getState().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;
    usePropertiesStore.getState().updateSmartlock(propertyId, {
      nfcEnabled: !property.smartlock.nfcEnabled,
    });
  },

  setLockOpen: (propertyId, open) => {
    const property = usePropertiesStore.getState().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;
    usePropertiesStore.getState().updateSmartlock(propertyId, {
      unlocked: open,
      lastOpenedAt: open ? new Date().toISOString() : property.smartlock.lastOpenedAt,
    });
  },

  openTenantLock: async (rentalId) => {
    const rental = useRentalsStore.getState().rentals.find((r) => r.id === rentalId);
    if (!rental?.hasKey) {
      useUserStore.getState().pushToast({
        message: "No tenés una llave NFC asignada para esta unidad",
        severity: "error",
      });
      return;
    }
    if (!rental.propertyId) {
      useUserStore.getState().pushToast({
        message: "Esta unidad no tiene un propertyId on-chain vinculado.",
        severity: "error",
      });
      return;
    }

    await runUnlock({
      propertyId: BigInt(rental.propertyId),
      agreementAddress: rental.agreementAddress,
      expectedRole: "tenant",
      successMessage: `Smartlock abierto — ${rental.name}`,
      onSuccess: () => {},
    });
  },

  unlockLandlordLock: async (propertyId) => {
    const property = usePropertiesStore.getState().ownedProperties.find((p) => p.id === propertyId);
    if (!property) return;
    if (!property.smartlock.nfcEnabled && !isSmartlockMockMode()) {
      useUserStore.getState().pushToast({
        message: "Encendé el NFC antes de acercar el teléfono.",
        severity: "warning",
      });
      return;
    }
    if (!property.propertyId) {
      useUserStore.getState().pushToast({
        message: "Esta propiedad no tiene un propertyId on-chain vinculado.",
        severity: "error",
      });
      return;
    }

    await runUnlock({
      propertyId: BigInt(property.propertyId),
      agreementAddress: property.agreementAddress,
      expectedRole: "landlord",
      successMessage: `Cerradura abierta — ${property.name}`,
      onSuccess: () => {
        useSmartlockStore.getState().setLockOpen(propertyId, true);
      },
    });
  },

  toggleTenantNfc: (rentalId) => {
    const rental = useRentalsStore.getState().rentals.find((r) => r.id === rentalId);
    if (!rental) return;
    useRentalsStore.getState().updateRentalKey(rentalId, !rental.hasKey);
  },
}));

export type UseSmartlockStoreReturn = ReturnType<typeof useSmartlockStore>;

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

/** Used by URL-based unlock flow (Android → MetaMask browser). */
export async function signChallengeFromUrl(
  challengeBase64: string,
  agreementAddress?: string,
  expectedRole?: "landlord" | "tenant"
): Promise<void> {
  useSmartlockStore.setState({ isUnlocking: true });
  try {
    const challenge = decodeChallengePayload(decodeBase64Url(challengeBase64));

    const result = await SmartlockService.signChallengeFromUrl(challenge, agreementAddress, expectedRole);
    if (result.authorized) {
      useUserStore.getState().pushToast({
        message: `Desbloqueo verificado como ${result.role === "landlord" ? "propietario" : "inquilino"}`,
        severity: "success",
      });
    } else {
      useUserStore.getState().pushToast({
        message: "No autorizado para abrir esta cerradura.",
        severity: "error",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al firmar el desafío";
    useUserStore.getState().pushToast({ message, severity: "error" });
  } finally {
    useSmartlockStore.setState({ isUnlocking: false });
  }
}
