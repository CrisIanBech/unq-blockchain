import { ethers } from "ethers";
import { getSigner, getPropertyNFT } from "../blockchain-infra";

export class PropertiesRepository {
  static async createProperty(recipient: string, metadataURI: string): Promise<ethers.TransactionReceipt> {
    const signer = await getSigner();
    if (!signer) {
      throw new Error("No signer available. Connect MetaMask.");
    }
    const contract = getPropertyNFT(signer);
    const tx = await contract.mint(recipient, metadataURI);
    return await tx.wait();
  }
}
