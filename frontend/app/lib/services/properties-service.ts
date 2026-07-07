import { IPropertiesRepository } from "../repositories/properties-repository";
import { IGeocodingRepository } from "../repositories/geocoding-repository";
import { translateError } from "../errors/translator";
import { formatPropertyImage } from "@/lib/format";

export interface PropertyMintResult {
  txHash: string;
  contractAddress: string;
}

export class PropertiesService {
  constructor(
    private repo: IPropertiesRepository,
    private geocodingRepo: IGeocodingRepository
  ) { }

  /**
   * Mints a new property NFT and returns plain domain transaction details.
   */
  async mintProperty(recipient: string, metadataURI: string, latitude: number, longitude: number): Promise<PropertyMintResult & { tokenId?: number }> {
    try {
      const receipt = await this.repo.createProperty(recipient, metadataURI, latitude, longitude);

      let tokenId: number | undefined;
      if (receipt && receipt.logs) {
        for (const log of receipt.logs) {
          try {
            if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
              const parsedTokenId = Number(BigInt(log.topics[3]));
              if (!isNaN(parsedTokenId)) {
                tokenId = parsedTokenId;
                break;
              }
            }
          } catch (_e) {
            // Ignore
          }
        }
      }

      return {
        txHash: receipt.hash || receipt.transactionHash || "",
        contractAddress: receipt.contractAddress || "",
        tokenId
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getPropertyOwner(propertyId: number): Promise<string> {
    return this.repo.ownerOf(propertyId);
  }

  async getRentalNFTOwner(propertyId: number): Promise<string> {
    return this.repo.getRentalNFTOwner(propertyId);
  }

  async getRentalNFTUser(propertyId: number): Promise<string> {
    return this.repo.getRentalNFTUser(propertyId);
  }

  async getPropertyLocation(propertyId: number): Promise<{ lat: number; lng: number }> {
    return this.repo.getPropertyLocation(propertyId);
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

      if (fetchUrl.startsWith("data:")) {
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
      } else if (fetchUrl) {
        try {
          const response = await fetch(fetchUrl);
          if (!response.ok) {
            console.warn(`Failed to fetch metadata JSON (status ${response.status}) for url: ${fetchUrl}`);
          } else {
            metadata = await response.json();
          }
        } catch (e) {
          console.warn(`Error fetching metadata JSON for url ${fetchUrl}:`, e);
        }
      }

      if (location.lat !== 0 || location.lng !== 0) {
        const address = await this.geocodingRepo.reverseGeocodeMercator(location.lat, location.lng);

        if (address) {
          // Push address attribute
          if (!metadata.attributes) metadata.attributes = [];

          // Remove existing address if any
          metadata.attributes = metadata.attributes.filter((a: any) => a.trait_type !== "address");
          metadata.attributes.push({ trait_type: "address", value: address });
        }
      } else {
        console.log(`[Property ${propertyId}] Se salteó el geocoding porque las coordenadas son 0,0`);
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
              imageUrl: formatPropertyImage(metadata.images || metadata.image, addrAttr),
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
