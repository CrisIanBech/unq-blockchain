import { getServices } from "@/lib/services/service-registry";
import { getLatestBlockTimestamp } from "@/lib/blockchain-infra";

export interface AddPropertyInput {
  name: string;
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
  images: string[];
}

export class PropertyDashboardService {
  async mintProperty(wallet: string, input: AddPropertyInput): Promise<{ tokenId?: number; txHash: string; lat: number; lng: number }> {
    const { propertiesService } = getServices(wallet);

    const lat = -34.6037 + (Math.random() - 0.5) * 0.08;
    const lng = -58.4 + (Math.random() - 0.5) * 0.08;

    // Convert CID or raw text images to native IPFS references (ipfs://...) if needed
    const formattedImages = (input.images || []).map((img) => {
      const trimmed = img.trim();
      if (trimmed.startsWith("ipfs://")) return trimmed;
      if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,})$/.test(trimmed)) {
        return `ipfs://${trimmed}`;
      }
      return trimmed;
    });

    // Construct base64 metadata URI to store name, address, rent and physical attributes on-chain
    const metadata = {
      name: input.name,
      description: `Tokenized property: ${input.name}`,
      image: formattedImages.length > 0 ? formattedImages[0] : "",
      images: formattedImages,
      attributes: [
        { trait_type: "type", value: input.type },
        { trait_type: "address", value: input.address },
        { trait_type: "monthlyRent", value: input.monthlyRent },
        { trait_type: "surface", value: input.surface },
        { trait_type: "rooms", value: input.rooms },
        { trait_type: "bathrooms", value: input.bathrooms },
        { trait_type: "pets", value: input.pets },
        { trait_type: "garage", value: input.garage }
      ]
    };
    const base64Metadata = btoa(unescape(encodeURIComponent(JSON.stringify(metadata))));
    const metadataURI = `data:application/json;base64,${base64Metadata}`;

    const result = await propertiesService.mintProperty(wallet, metadataURI, lat, lng);
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
