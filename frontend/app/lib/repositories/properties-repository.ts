import { ethers } from "ethers";
import { getSigner, getPropertyNFT } from "../blockchain-infra";

export interface IPropertiesRepository {
  createProperty(recipient: string, metadataURI: string): Promise<any>;
  getPropertyMetadataURI(propertyId: number): Promise<string>;
  getPropertyLocation(propertyId: number): Promise<{ lat: number; lng: number }>;
  getOwnedProperties(ownerAddress: string): Promise<number[]>;
}

export class PropertiesRepository implements IPropertiesRepository {
  async createProperty(recipient: string, metadataURI: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) {
      throw new Error("No signer available. Connect MetaMask.");
    }

    const nftContract = getPropertyNFT(signer);

    // Call mint(to, tokenURI, latitude, longitude)
    // We pass 0, 0 for lat/lng for now as it's not strictly required by the basic UI yet
    const tx = await nftContract.mint(recipient, metadataURI, 0, 0);
    return await tx.wait();
  }

  async getPropertyMetadataURI(propertyId: number): Promise<string> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    return await nftContract.tokenURI(BigInt(propertyId));
  }

  async getPropertyLocation(propertyId: number): Promise<{ lat: number; lng: number }> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    // returns [int256 latitude, int256 longitude]
    const location = await (nftContract as any).propertyLocations(BigInt(propertyId));
    
    // They are stored as Web Mercator meters, we return them raw here
    return { lat: Number(location[0]), lng: Number(location[1]) };
  }

  async getOwnedProperties(ownerAddress: string): Promise<number[]> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    
    // Query Transfer events where 'to' is ownerAddress
    const transferFilter = nftContract.filters.Transfer(null, ownerAddress);
    const transferEvents = await nftContract.queryFilter(transferFilter, 0, "latest");
    
    const candidates = new Set<number>();
    for (const event of transferEvents) {
      if ("args" in event && event.args) {
        const tokenId = Number(event.args[2]);
        candidates.add(tokenId);
      }
    }
    
    const ownedIds: number[] = [];
    for (const tokenId of candidates) {
      try {
        const currentOwner = await nftContract.ownerOf(BigInt(tokenId));
        if (currentOwner.toLowerCase() === ownerAddress.toLowerCase()) {
          ownedIds.push(tokenId);
        }
      } catch (err) {
        console.error(`Failed to verify owner of token ${tokenId}`, err);
      }
    }
    
    return ownedIds.sort((a, b) => a - b);
  }
}
