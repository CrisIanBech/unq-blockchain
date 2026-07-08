import { ReviewsRepository } from "../repositories/reviews-repository";
import { translateError } from "../errors/translator";
import { getReview, getPropertyNFT, getReadProvider } from "../blockchain-infra";
import { ReviewDTO } from "../../models/contract-dtos";

export class ReviewsService {
  static async getReviewCount(propertyId: number): Promise<number> {
    try {
      return await ReviewsRepository.getReviewCount(propertyId);
    } catch (error) {
      throw translateError(error);
    }
  }

  static async getAllReviews(propertyId: number): Promise<ReviewDTO[]> {
    try {
      return await ReviewsRepository.getAllReviews(propertyId);
    } catch (error) {
      throw translateError(error);
    }
  }

  static async postReview(propertyId: number, rating: number, comment: string): Promise<string> {
    try {
      if (rating < 1 || rating > 5) throw new Error("Rating must be between 1 and 5");
      if (comment.trim().length < 3) throw new Error("Comment must be at least 3 characters");
      if (comment.length > 280) throw new Error("Comment must be at most 280 characters");
      return await ReviewsRepository.postReview(propertyId, rating, comment.trim());
    } catch (error) {
      throw translateError(error);
    }
  }

  static async canPostReview(propertyId: number, accountAddress: string): Promise<boolean> {
    try {
      if (!accountAddress) return false;
      const provider = getReadProvider();
      const nft = getPropertyNFT(provider);
      const owner = await nft.ownerOf(BigInt(propertyId));

      const agreementAddr = await ReviewsRepository.getActiveRental(propertyId);
      const rs = getReview(provider);

      if (owner.toLowerCase() === accountAddress.toLowerCase()) {
        if (agreementAddr !== "0x0000000000000000000000000000000000000000") {
          const status = await ReviewsRepository.getAgreementStatus(agreementAddr);
          if (status !== 2) return false;

          const alreadyReviewed = await rs.hasReviewedLandlord(agreementAddr);
          return !alreadyReviewed;
        } else {
          const alreadyReviewed = await rs.hasReviewedLandlordGeneral(BigInt(propertyId));
          return !alreadyReviewed;
        }
      }

      if (agreementAddr === "0x0000000000000000000000000000000000000000") return false;

      const status = await ReviewsRepository.getAgreementStatus(agreementAddr);
      if (status !== 2) return false;

      const tenant = await ReviewsRepository.getAgreementTenant(agreementAddr);
      if (tenant.toLowerCase() !== accountAddress.toLowerCase()) return false;

      const alreadyReviewed = await rs.hasReviewed(agreementAddr);
      return !alreadyReviewed;
    } catch (error) {
      throw translateError(error);
    }
  }
}
