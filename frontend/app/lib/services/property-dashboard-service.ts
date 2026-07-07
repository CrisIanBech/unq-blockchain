import { getServices } from "@/lib/services/service-registry";
import { getLatestBlockTimestamp } from "@/lib/blockchain-infra";

export interface AddPropertyInput {
  type: "departamento" | "casa" | "ph" | "local" | "oficina";
  address: string;
  monthlyRent: number;
  realEstateToken: string;
  rentalToken: string;
  surface: number;
  rooms: number;
  bathrooms: number;
  pets: boolean;
  garage: boolean;
  images: File[];
}

export class PropertyDashboardService {
  async preparePropertyMetadata(input: AddPropertyInput): Promise<string> {
    const formData = new FormData();
    formData.append("type", input.type);
    formData.append("address", input.address);
    formData.append("monthlyRent", input.monthlyRent.toString());
    formData.append("realEstateToken", input.realEstateToken);
    formData.append("rentalToken", input.rentalToken);
    formData.append("surface", input.surface.toString());
    formData.append("rooms", input.rooms.toString());
    formData.append("bathrooms", input.bathrooms.toString());
    formData.append("pets", input.pets.toString());
    formData.append("garage", input.garage.toString());
    
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

  async mintProperty(wallet: string, input: AddPropertyInput): Promise<{ tokenId?: number; txHash: string; lat: number; lng: number }> {
    const { propertiesService } = getServices(wallet);

    const lat = -34.6037 + (Math.random() - 0.5) * 0.08;
    const lng = -58.4 + (Math.random() - 0.5) * 0.08;

    // Call backend to upload images and metadata to IPFS, receiving native tokenURI
    const tokenURI = await this.preparePropertyMetadata(input);

    const result = await propertiesService.mintProperty(wallet, tokenURI, lat, lng);
    return {
      tokenId: result.tokenId,
      txHash: result.txHash,
      lat: result.lat,
      lng: result.lng
    };
  }

  async verifyPropertyOwnership(wallet: string, propertyId: number): Promise<void> {
    const { propertiesService } = getServices(wallet);
    const owner = await propertiesService.getPropertyOwner(propertyId);
    if (owner.toLowerCase() !== wallet.toLowerCase()) {
      throw new Error("No eres el propietario de este Token ID.");
    }
  }

  async createContract(
    wallet: string,
    tokenId: number,
    tenant: string,
    rent: number
  ): Promise<{ agreementAddress: string; txHash: string }> {
    const { rentalsService } = getServices(wallet);
    const oneDaySeconds = 24 * 60 * 60;
    const thirtyDaysSeconds = 30 * oneDaySeconds;

    const currentTimestamp = await getLatestBlockTimestamp();
    const result = await rentalsService.createRental({
      propertyId: BigInt(tokenId),
      tenant,
      baseRent: rent,
      securityDeposit: rent * 2,
      inflationBps: 500,
      lateFeeBps: 100,
      gracePeriod: 5 * oneDaySeconds,
      duration: 12 * thirtyDaysSeconds,
      deadline: currentTimestamp + 7 * oneDaySeconds
    });

    return result;
  }
}
