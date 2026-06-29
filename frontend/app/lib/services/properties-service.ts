import { PropertiesRepository } from "../repositories/properties-repository";
import { translateError } from "../errors/translator";

export interface PropertyMintResult {
  txHash: string;
  contractAddress: string;
}

export class PropertiesService {
  /**
   * Mints a new property NFT and returns plain domain transaction details.
   */
  static async mintProperty(recipient: string, metadataURI: string): Promise<PropertyMintResult> {
    try {
      const receipt = await PropertiesRepository.createProperty(recipient, metadataURI);
      return {
        txHash: receipt.hash,
        contractAddress: receipt.contractAddress || ""
      };
    } catch (error) {
      throw translateError(error);
    }
  }
}
