import { getServices } from "@/lib/services/service-registry";
import { getLatestBlockTimestamp } from "@/lib/blockchain-infra";

export interface AddPropertyInput {
  name: string;
  type: "departamento" | "casa" | "ph" | "local" | "oficina";
  address: string;
  monthlyRent: number;
  realEstateToken: string;
  rentalToken: string;
}

export class PropertyDashboardService {
  async mintProperty(wallet: string, input: AddPropertyInput): Promise<{ tokenId?: number; txHash: string }> {
    const { propertiesService } = getServices(wallet);

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
