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
  status: number
  landlordApproved: boolean
  tenantApproved: boolean
  landlordCancelled: boolean
  tenantCancelled: boolean
  totalPeriods: number
  periodsPaid: number
  periodStart: string
  periodEnd: string
  periodLabel: string
  monthLabelForRecord: string
}

export interface Rental {
  id: string;
  agreementAddress?: string;
  propertyId: number;
  name: string;
  type: PropertyType;
  address: string;
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
