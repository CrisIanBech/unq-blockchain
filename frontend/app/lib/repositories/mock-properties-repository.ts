import { IPropertiesRepository } from "./properties-repository";

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

export class MockPropertiesRepository implements IPropertiesRepository {
  async createProperty(recipient: string, metadataURI: string): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    return {
      hash: fakeTx(),
      contractAddress: "0xMockProperty" + fakeTx().slice(0, 10)
    };
  }

  async getPropertyMetadataURI(propertyId: number): Promise<string> {
    await new Promise((res) => setTimeout(res, 500));
    // For mock, just return a fake IPFS URI
    return `ipfs://mock-property-${propertyId.toString()}`;
  }

  async getPropertyLocation(propertyId: number): Promise<{ lat: number; lng: number }> {
    await new Promise((res) => setTimeout(res, 500));
    // Mock location in Web Mercator (e.g., somewhere in Buenos Aires)
    // Buenos Aires lat/lng: -34.6037, -58.3816
    // Web Mercator: -6500000, -4100000 approx
    return { lat: -4100000, lng: -6500000 };
  }

  async getOwnedProperties(ownerAddress: string): Promise<number[]> {
    await new Promise((res) => setTimeout(res, 500));
    if (ownerAddress.toLowerCase() === "0xmockuser" || ownerAddress === "") {
      return [1, 2, 3];
    }
    return [];
  }

  async ownerOf(propertyId: number): Promise<string> {
    await new Promise((res) => setTimeout(res, 100));
    return "0xMockUser";
  }
}
