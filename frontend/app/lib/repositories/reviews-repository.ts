import { getReview, getRentalAgreementFactory, getRentalAgreement, getReadProvider, getSigner, fetchEventsInChunks } from "../blockchain-infra";

export interface OnChainReview {
  author: string;
  agreement: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export class ReviewsRepository {
  static async getReviewCount(propertyId: number): Promise<number> {
    const provider = getReadProvider();
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
    const provider = getReadProvider();
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

  static async hasReviewed(agreementAddress: string): Promise<boolean> {
    const provider = getReadProvider();
    try {
      const rs = getReview(provider);
      return await rs.hasReviewed(agreementAddress);
    } catch (error) {
      console.error("ReviewsRepository: Failed to check hasReviewed", error);
      return false;
    }
  }

  static async getActiveRental(propertyId: number): Promise<string> {
    const ZERO = "0x0000000000000000000000000000000000000000";
    const provider = getReadProvider();
    try {
      const factory = getRentalAgreementFactory(provider);
      // The factory is stateless — query the RentalAgreementCreated event log
      // to find the most recently deployed agreement for this property.
      const filter = factory.filters.RentalAgreementCreated(null, BigInt(propertyId));
      const startBlock = Number(import.meta.env.VITE_DEPLOY_BLOCK) || 0;
      const events = await fetchEventsInChunks(factory, filter, startBlock);
      if (events.length === 0) return ZERO;
      const latest = events[events.length - 1];
      if ("args" in latest && latest.args) return latest.args[0] as string;
      return ZERO;
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch active rental", error);
      return ZERO;
    }
  }

  static async getAgreementTenant(agreementAddress: string): Promise<string> {
    const provider = getReadProvider();
    try {
      const agreement = getRentalAgreement(agreementAddress, provider);
      return await agreement.tenant();
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch tenant", error);
      return "";
    }
  }

  static async getAgreementStatus(agreementAddress: string): Promise<number> {
    const provider = getReadProvider();
    try {
      const agreement = getRentalAgreement(agreementAddress, provider);
      return Number(await agreement.status());
    } catch (error) {
      console.error("ReviewsRepository: Failed to fetch status", error);
      return 0;
    }
  }
}
