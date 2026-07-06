export type PropertyType = "departamento" | "casa" | "ph" | "local" | "oficina"

export type PaymentStatus = "paid" | "pending" | "overdue"

export interface PaymentRecord {
  /** ISO month, e.g. "2026-06" or unique period ID */
  month: string
  periodLabel?: string
  amount: number
  lateFee?: number
  status: PaymentStatus
  /** ISO datetime when paid */
  paidAt?: string
  /** simulated on-chain tx hash */
  txHash?: string
}

export interface Smartlock {
  id: string
  /** Whether the landlord has installed/registered the virtual lock */
  installed: boolean
  /** Whether NFC radio is currently active */
  nfcEnabled: boolean
  /** Whether the lock is currently open */
  unlocked: boolean
  lastOpenedAt?: string
}

/** A property the current user OWNS (is the landlord). */
export interface OwnedProperty {
  id: string
  name: string
  type: PropertyType
  address: string
  imageUrl: string
  propertyId?: number
  realEstateToken: string
  rentalToken: string
  agreementAddress?: string
  rentalNFTAddress?: string
  monthlyRent: number
  tenant: string | null
  tenantSince?: string
  nextChargeDate?: string
  payments: PaymentRecord[]
  availableToWithdraw: number
  smartlock: Smartlock
  contractStatus: "draft" | "active" | "cancelled"
  landlordApproved?: boolean
  tenantApproved?: boolean
}

export interface Rental {
  id: string; // Used as the agreement address
  propertyId: number;
  name: string;
  type: PropertyType;
  address: string;
  imageUrl: string;
  landlord: string;
  tenant?: string;
  hasKey?: boolean;
  rentalNFTAddress?: string;
  smartlockId?: string;

  // Contract Details (optional if it's just a listing without contract)
  baseRent: number;
  securityDeposit: number;
  inflationBps: number;
  lateFeeBps: number;
  gracePeriod: number;
  paymentPeriod: number;
  duration: number;
  deadline: number;
  startTime: number;
  rentPaidUntil: number;
  amountToPay: number;
  lateFeeAmount: number;
  status: number;
  landlordApproved: boolean;
  tenantApproved: boolean;
  landlordCancelled: boolean;
  tenantCancelled: boolean;
}

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  date: string
}

export interface Listing {
  id: string
  name: string
  type: PropertyType
  address: string
  imageUrl: string
  monthlyRent: number
  lat: number
  lng: number
  reviews: Review[]
  beds: number
  baths: number
  m2: number
}

export interface Toast {
  id: number
  message: string
  severity: "success" | "info" | "warning" | "error"
  txHash?: string
}
