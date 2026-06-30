import { ethers } from "ethers";
import { getSigner, getPropertyNFT } from "../blockchain-infra";

export interface IPropertiesRepository {
  createProperty(recipient: string, metadataURI: string): Promise<any>;
  getPropertyMetadataURI(propertyId: number): Promise<string>;
  getPropertyLocation(propertyId: number): Promise<{ lat: number; lng: number }>;
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
}
