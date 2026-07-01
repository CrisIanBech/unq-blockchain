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
      } else if (fetchUrl.startsWith("data:")) {
        try {
          const base64Data = fetchUrl.split(",")[1];
          const jsonStr = decodeURIComponent(
            atob(base64Data)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join("")
          );
          metadata = JSON.parse(jsonStr);
        } catch (e) {
          console.error("Failed to parse data URI metadata", e);
          metadata = {};
        }
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

  async getOwnedProperties(ownerAddress: string): Promise<any[]> {
    try {
      const tokenIds = await this.repo.getOwnedProperties(ownerAddress);
      
      const properties = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            const metadata = await this.getPropertyMetadata(tokenId);
            
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
              type: "departamento",
              address: "Dirección no disponible",
              imageUrl: `/images/prop-${(tokenId % 5) + 1}.png`,
              monthlyRent: 0,
            };
          }
        })
      );
      
      return properties;
    } catch (error) {
      throw translateError(error);
    }
  }
}
