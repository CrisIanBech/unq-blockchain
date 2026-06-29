export interface RentPaidEvent {
  agreementAddress: string;
  tenant: string;
  amount: number;
  month: string;
  txHash: string;
}

export interface AgreementActivatedEvent {
  agreementAddress: string;
  landlord: string;
  tenant: string;
  txHash: string;
}

export interface AgreementCancelledEvent {
  agreementAddress: string;
  txHash: string;
}

export type RentPaidListener = (event: RentPaidEvent) => void;
export type AgreementActivatedListener = (event: AgreementActivatedEvent) => void;
export type AgreementCancelledListener = (event: AgreementCancelledEvent) => void;

export interface RentalEvents {
  subscribeToRentPaid(agreementAddress: string, listener: RentPaidListener): () => void;
  subscribeToAgreementActivated(agreementAddress: string, listener: AgreementActivatedListener): () => void;
  subscribeToAgreementCancelled(agreementAddress: string, listener: AgreementCancelledListener): () => void;
}
