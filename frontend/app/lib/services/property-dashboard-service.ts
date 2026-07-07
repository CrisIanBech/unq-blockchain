import { getServices } from "@/lib/services/service-registry";
import { getLatestBlockTimestamp } from "@/lib/blockchain-infra";

export interface AddPropertyInput {
  /** Display name stored locally for the property import reference */
  name: string;
  /** IPFS / https / data URI pointing to the ERC-721 metadata JSON */
  tokenURI: string;
  /** Web Mercator latitude in meters (range ±20 037 509), stored on-chain */
  latitude: number;
  /** Web Mercator longitude in meters (range ±20 037 509), stored on-chain */
  longitude: number;
}

export interface CreateContractInput {
  propertyId: number;
  tenant: string;
  baseRent: number;
  securityDeposit: number;
  durationMonths: number;
  gracePeriodDays: number;
  lateFeeBps: number;
  inflationBps: number;
  paymentPeriodDays: number;
  inflationAdjustmentInterval: number;
  deadlineDays: number;
}

export class PropertyDashboardService {
  /**
   * Uploads property metadata and images to IPFS via the NestJS backend.
   * Returns the IPFS tokenURI (ipfs://…) to be stored on-chain.
   */
  async preparePropertyMetadata(input: {
    name: string;
    type: string;
    address: string;
    surface: number;
    rooms: number;
    bathrooms: number;
    pets: boolean;
    garage: boolean;
    contact?: string;
    images: File[];
  }): Promise<string> {
    const formData = new FormData();
    formData.append("name", input.name);
    formData.append("type", input.type);
    formData.append("address", input.address);
    formData.append("surface", input.surface.toString());
    formData.append("rooms", input.rooms.toString());
    formData.append("bathrooms", input.bathrooms.toString());
    formData.append("pets", input.pets.toString());
    formData.append("garage", input.garage.toString());
    formData.append("contact", input.contact ?? "");

    input.images.forEach((file) => {
      formData.append("files", file);
    });

    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const response = await fetch(`${backendUrl}/properties/metadata`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Error al preparar la metadata e imágenes en IPFS.");
    }

    const data = await response.json();
    return data.tokenURI;
  }


  async mintProperty(wallet: string, input: AddPropertyInput): Promise<{ tokenId?: number; txHash: string }> {
    const { propertiesService } = getServices(wallet);

    // Pass the IPFS (or other) URI directly to the contract — no base64 wrapping
    const result = await propertiesService.mintProperty(wallet, input.tokenURI, input.latitude, input.longitude);
    return {
      tokenId: result.tokenId,
      txHash: result.txHash
    };
  }

  async verifyPropertyOwnership(wallet: string, propertyId: number): Promise<void> {
    if (import.meta.env.VITE_USE_MOCKS === "true") {
      return;
    }
    const { propertiesService } = getServices(wallet);
    const owner = await propertiesService.getPropertyOwner(propertyId);
    if (owner.toLowerCase() !== wallet.toLowerCase()) {
      throw new Error("No eres el propietario de este Token ID.");
    }
  }

  async createContract(
    wallet: string,
    input: CreateContractInput
  ): Promise<{ agreementAddress: string; txHash: string }> {
    const { rentalsService } = getServices(wallet);
    const oneDaySeconds = 24 * 60 * 60;
    const thirtyDaysSeconds = 30 * oneDaySeconds;

    const currentTimestamp = await getLatestBlockTimestamp();
    const result = await rentalsService.createRental({
      propertyId: BigInt(input.propertyId),
      tenant: input.tenant,
      baseRent: input.baseRent,
      securityDeposit: input.securityDeposit,
      inflationBps: input.inflationBps,
      lateFeeBps: input.lateFeeBps,
      gracePeriod: input.gracePeriodDays * oneDaySeconds,
      paymentPeriod: input.paymentPeriodDays * oneDaySeconds,
      inflationAdjustmentInterval: input.inflationAdjustmentInterval,
      duration: input.durationMonths * thirtyDaysSeconds,
      deadline: currentTimestamp + input.deadlineDays * oneDaySeconds
    });

    return result;
  }
}
