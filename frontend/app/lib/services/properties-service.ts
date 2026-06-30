import { IPropertiesRepository } from "../repositories/properties-repository";
import { IGeocodingRepository } from "../repositories/geocoding-repository";
import { translateError } from "../errors/translator";

export interface PropertyMintResult {
  txHash: string;
  contractAddress: string;
}

export class PropertiesService {
  constructor(
    private repo: IPropertiesRepository,
    private geocodingRepo: IGeocodingRepository
  ) {}

  /**
   * Mints a new property NFT and returns plain domain transaction details.
   */
  async mintProperty(recipient: string, metadataURI: string): Promise<PropertyMintResult> {
    try {
      const receipt = await this.repo.createProperty(recipient, metadataURI);
        
      return {
        txHash: receipt.hash,
        contractAddress: receipt.contractAddress || ""
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getPropertyMetadata(propertyId: number): Promise<any> {
    try {
      const uri = await this.repo.getPropertyMetadataURI(propertyId);
      const location = await this.repo.getPropertyLocation(propertyId);
      
      let fetchUrl = uri;
      if (uri.startsWith("ipfs://")) {
        fetchUrl = uri.replace("ipfs://", "https://ipfs.io/ipfs/");
      }

      let metadata: any = {};
      
      if (fetchUrl.includes("mock-property")) {
        metadata = {
          name: `Propiedad #${propertyId.toString()}`,
          description: "Propiedad importada",
          image: "/images/prop-5.png",
          attributes: [
            { trait_type: "type", value: "departamento" }
          ]
        };
      } else {
        const response = await fetch(fetchUrl);
        if (!response.ok) {
          throw new Error("Failed to fetch metadata JSON");
        }
        metadata = await response.json();
      }

      // Reverse geocoding
      if (location.lat !== 0 || location.lng !== 0) {
        const address = await this.geocodingRepo.reverseGeocodeMercator(location.lat, location.lng);
        if (address) {
          // Push address attribute
          if (!metadata.attributes) metadata.attributes = [];
          
          // Remove existing address if any
          metadata.attributes = metadata.attributes.filter((a: any) => a.trait_type !== "address");
          metadata.attributes.push({ trait_type: "address", value: address });
        }
      }

      return metadata;
    } catch (error) {
      throw translateError(error);
    }
  }
}
