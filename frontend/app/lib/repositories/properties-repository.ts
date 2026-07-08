import { ethers } from "ethers";
import { getSigner, getPropertyNFT, fetchEventsInChunks } from "../blockchain-infra";
import { LocationDTO, RentalNFTDataDTO } from "../../models/contract-dtos";

export interface IPropertiesRepository {
  createProperty(recipient: string, metadataURI: string, latitude: number, longitude: number): Promise<any>;
  getPropertyMetadataURI(propertyId: number): Promise<string>;
  getPropertyLocation(propertyId: number): Promise<LocationDTO>;
  getOwnedProperties(ownerAddress: string): Promise<number[]>;
  ownerOf(propertyId: number): Promise<string>;
  getRentalNFTOwner(propertyId: number): Promise<string>;
  getRentalNFTData(propertyId: number): Promise<RentalNFTDataDTO>;
}

export class PropertiesRepository implements IPropertiesRepository {
  async createProperty(recipient: string, metadataURI: string, latitude: number, longitude: number): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) {
      throw new Error("No signer available. Connect MetaMask.");
    }

    const nftContract = getPropertyNFT(signer);

    // Call mint(to, tokenURI, latitude, longitude) — lat/lng are Web Mercator meters
    const tx = await nftContract.mint(recipient, metadataURI, latitude, longitude);
    return await tx.wait();
  }

  async getPropertyMetadataURI(propertyId: number): Promise<string> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    return await nftContract.tokenURI(BigInt(propertyId));
  }

  async getPropertyLocation(propertyId: number): Promise<LocationDTO> {
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
    const startBlock = Number(import.meta.env.VITE_DEPLOY_BLOCK) || 0;
    const transferEvents = await fetchEventsInChunks(nftContract, transferFilter, startBlock);
    
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

  async ownerOf(propertyId: number): Promise<string> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    return await nftContract.ownerOf(BigInt(propertyId));
  }

  async getRentalNFTOwner(propertyId: number): Promise<string> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    const rentalNFTAddress = await nftContract.rentalNFT();
    const rentalContract = new ethers.Contract(
      rentalNFTAddress,
      ["function ownerOf(uint256 tokenId) view returns (address)"],
      signer
    );
    return await rentalContract.ownerOf(BigInt(propertyId));
  }

  async getRentalNFTData(propertyId: number): Promise<RentalNFTDataDTO> {
    const signer = await getSigner();
    if (!signer) throw new Error("No signer available.");

    const nftContract = getPropertyNFT(signer);
    const rentalNFTAddress = await nftContract.rentalNFT();
    const rentalContract = new ethers.Contract(
      rentalNFTAddress,
      [
        "function userOf(uint256 tokenId) view returns (address)",
        "function userExpires(uint256 tokenId) view returns (uint256)"
      ],
      signer
    );
    
    const user = await rentalContract.userOf(BigInt(propertyId));
    const expires = await rentalContract.userExpires(BigInt(propertyId));

    return {
      rentalNFTAddress,
      user,
      expires: Number(expires)
    };
  }
}
