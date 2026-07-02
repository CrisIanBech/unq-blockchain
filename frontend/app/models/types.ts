export type PropertyType = "departamento" | "casa" | "ph" | "local" | "oficina"

export type PaymentStatus = "paid" | "pending" | "overdue"

export interface PaymentRecord {
  /** ISO month, e.g. "2026-06" */
  month: string
  amount: number
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
  /** Real blockchain property NFT token ID */
  propertyId?: number
  /** Token addresses (simulated/real). */
  realEstateToken: string
  rentalToken: string
  agreementAddress?: string
  rentalNFTAddress?: string
  monthlyRent: number
  /** null when vacant */
  tenant: string | null
  tenantSince?: string
  nextChargeDate?: string
  payments: PaymentRecord[]
  /** Stablecoin (USDC) collected and available to withdraw */
  availableToWithdraw: number
  smartlock: Smartlock
  contractStatus: "draft" | "active" | "cancelled"
}

export interface RentalContractDetails {
  baseRent: number
  securityDeposit: number
  inflationBps: number
  lateFeeBps: number
  gracePeriod: number
  paymentPeriod: number
  duration: number
  deadline: number
  startTime: number
  rentPaidUntil: number
  
  amountToPay: number
  lateFeeAmount: number
  isLate: boolean
}

/** A property the current user RENTS (is the tenant). */
export interface Rental {
  id: string; // The agreementAddress
  agreementAddress?: string;
  propertyId: number;
  name: string;
  type: PropertyType;
  address: string; // physical address
  imageUrl: string;
  landlord: string;
  tenant?: string;
  monthlyRent: number;
  payments: PaymentRecord[];
  contractDetails?: RentalContractDetails;
  nextPaymentDate?: string;
  hasKey?: boolean;
  rentalNFTAddress?: string;
  smartlockId?: string;
}

export interface Review {
  id: string
  author: string
  rating: number
  comment: string
  date: string
}

/** A property listed on the marketplace map (available to rent). */
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
