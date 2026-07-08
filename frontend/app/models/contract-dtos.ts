/**
 * Data Transfer Objects (DTOs) mapping directly to Smart Contract returns.
 */

export interface LocationDTO {
  lat: number;
  lng: number;
}

export interface RentalNFTDataDTO {
  rentalNFTAddress: string;
  user: string;
  expires: number;
}

export interface ReviewDTO {
  author: string;
  agreement: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface PropertyMetadataDTO {
  name?: string;
  description?: string;
  image?: string;
  images?: string[];
  attributes?: { trait_type: string; value: string | number }[];
  monthlyRent?: number;
  [key: string]: any;
}

export interface PropertyMintResultDTO {
  txHash: string;
  contractAddress: string;
  tokenId?: number;
}

export interface OwnedPropertySummaryDTO {
  propertyId: number;
  name: string;
  type: string;
  address: string;
  imageUrl: string;
  monthlyRent: number;
}

export interface RentalAgreementDTO {
  propertyId: number;
  tenant: string;
  landlord: string;
  baseRent: number;
  rentPaidUntil: number;
  status: number;
  startTime: number;
  paymentPeriod: number;
  securityDeposit: number;
  inflationBps: number;
  lateFeeBps: number;
  gracePeriod: number;
  duration: number;
  deadline: number;
  landlordApproved: boolean;
  tenantApproved: boolean;
  landlordCancelled: boolean;
  tenantCancelled: boolean;
  inflationAdjustmentInterval: number;
  depositStatus: number;
}

export interface PaymentEventDTO {
  periodIndex: number;
  amount: number;
  lateFee: number;
  txHash: string;
  timestamp: number;
}

export interface RentalCreationResultDTO {
  agreementAddress: string;
  txHash: string;
}

export interface TransactionResultDTO {
  txHash: string;
}
