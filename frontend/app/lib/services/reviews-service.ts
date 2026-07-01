import { ReviewsRepository, type OnChainReview } from "../repositories/reviews-repository";
import { translateError } from "../errors/translator";

export type { OnChainReview };

export class ReviewsService {
  static async getReviewCount(propertyId: number): Promise<number> {
    try {
      return await ReviewsRepository.getReviewCount(propertyId);
    } catch (error) {
      throw translateError(error);
    }
  }

  static async getAllReviews(propertyId: number): Promise<OnChainReview[]> {
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
      const agreementAddr = await ReviewsRepository.getActiveRental(propertyId);
      if (agreementAddr === "0x0000000000000000000000000000000000000000") return false;

      const tenant = await ReviewsRepository.getAgreementTenant(agreementAddr);
      return tenant.toLowerCase() === accountAddress.toLowerCase();
    } catch (error) {
      throw translateError(error);
    }
  }
}
