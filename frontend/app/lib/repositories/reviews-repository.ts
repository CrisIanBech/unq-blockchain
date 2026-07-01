import { ethers } from "ethers";
import { getReview, getRentalNFT, getRentalAgreement, getBrowserProvider, getSigner } from "../blockchain-infra";

export interface OnChainReview {
  author: string;
  agreement: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export class ReviewsRepository {
  static async getReviewCount(propertyId: number): Promise<number> {
    const provider = getBrowserProvider();
    if (!provider) return 0;
    try {
      const rs = getReview(provider);
      const count = await rs.getReviewCount(propertyId);
      return Number(count);
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch review count", error);
      return 0;
    }
  }

  static async getReview(propertyId: number, index: number): Promise<OnChainReview | null> {
    const provider = getBrowserProvider();
    if (!provider) return null;
    try {
      const rs = getReview(provider);
      const result = await rs.getReview(propertyId, index);
      return {
        author: result.author,
        agreement: result.agreement,
        rating: Number(result.rating),
        comment: result.comment,
        timestamp: Number(result.timestamp),
      };
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch review", error);
      return null;
    }
  }

  static async getAllReviews(propertyId: number): Promise<OnChainReview[]> {
    const count = await this.getReviewCount(propertyId);
    if (count === 0) return [];
    const reviews: OnChainReview[] = [];
    for (let i = 0; i < count; i++) {
      const review = await this.getReview(propertyId, i);
      if (review) reviews.push(review);
    }
    return reviews;
  }

  static async postReview(propertyId: number, rating: number, comment: string): Promise<string> {
    const signer = await getSigner();
    if (!signer) throw new Error("No wallet connected");
    const rs = getReview(signer);
    const tx = await rs.postReview(propertyId, rating, comment);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  static async getActiveRental(propertyId: number): Promise<string> {
    const provider = getBrowserProvider();
    if (!provider) return "0x0000000000000000000000000000000000000000";
    try {
      const rs = getReview(provider);
      const rentalNFTAddr = await rs.rentalNFT();
      const rentalNFT = getRentalNFT(rentalNFTAddr, provider);
      return await rentalNFT.userOf(propertyId);
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch active rental", error);
      return "0x0000000000000000000000000000000000000000";
    }
  }

  static async getAgreementTenant(agreementAddress: string): Promise<string> {
    const provider = getBrowserProvider();
    if (!provider) return "";
    try {
      const agreement = getRentalAgreement(agreementAddress, provider);
      return await agreement.tenant();
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch tenant", error);
      return "";
    }
  }
}
