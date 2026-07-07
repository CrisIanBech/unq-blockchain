import { IPropertiesRepository } from "./properties-repository";

const fakeTx = () => `0x${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`;

/** tokenId → owner address (mock chain state) */
const mockOwners: Record<number, string> = {};

let nextTokenId = 1;

export function registerMockPropertyOwner(propertyId: number, owner: string): void {
  mockOwners[propertyId] = owner;
}

export function ensureMockDemoProperty(owner: string): number {
  const demoId = 1;
  if (!mockOwners[demoId]) {
    mockOwners[demoId] = owner;
  }
  return demoId;
}

export class MockPropertiesRepository implements IPropertiesRepository {
  async createProperty(recipient: string, metadataURI: string, latitude = 0, longitude = 0): Promise<any> {
    await new Promise((res) => setTimeout(res, 500));
    const tokenId = nextTokenId++;
    mockOwners[tokenId] = recipient;
    return {
      hash: fakeTx(),
      contractAddress: "0xMockProperty" + fakeTx().slice(0, 10),
      logs: [
        {
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            `0x${tokenId.toString(16).padStart(64, "0")}`,
          ],
        },
      ],
    };
  }

  async getPropertyMetadataURI(propertyId: number): Promise<string> {
    await new Promise((res) => setTimeout(res, 200));
    return `ipfs://mock-property-${propertyId.toString()}`;
  }

  async getPropertyLocation(propertyId: number): Promise<{ lat: number; lng: number }> {
    await new Promise((res) => setTimeout(res, 200));
    return { lat: -4100000, lng: -6500000 };
  }

  async getOwnedProperties(ownerAddress: string): Promise<number[]> {
    await new Promise((res) => setTimeout(res, 200));
    if (!ownerAddress) return [];
    return Object.entries(mockOwners)
      .filter(([, owner]) => owner.toLowerCase() === ownerAddress.toLowerCase())
      .map(([id]) => Number(id))
      .sort((a, b) => a - b);
  }

  async ownerOf(propertyId: number): Promise<string> {
    await new Promise((res) => setTimeout(res, 100));
    const owner = mockOwners[propertyId];
    if (!owner) {
      throw new Error(`Mock token ${propertyId} does not exist`);
    }
    return owner;
  }

  async getRentalNFTOwner(_propertyId: number): Promise<string> {
    await new Promise((res) => setTimeout(res, 100));
    return "0x0000000000000000000000000000000000000000";
  }

  async getRentalNFTUser(_propertyId: number): Promise<string> {
    await new Promise((res) => setTimeout(res, 100));
    return "0x0000000000000000000000000000000000000000";
  }
}
