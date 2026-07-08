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

export interface RentalAgreementData {
  agreementAddress: string
  propertyId: number
  tenant: string
  landlord: string
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
  status: string // e.g. "PendingSignatures" | "Active" | "Cancelled" | "Expired" | "Completed" | "Defaulted"
  landlordApproved: boolean
  tenantApproved: boolean
  landlordCancelled: boolean
  tenantCancelled: boolean
}

export interface RentalData {
  rentalNFTAddress: string
  user: string
  expires: number
  currentContract: RentalAgreementData | null
  availableToWithdraw?: number
}

export interface Smartlock {
  installed: boolean
  nfcEnabled: boolean
  open: boolean
}

export interface RentalMetadata {
  type?: PropertyType
  surface?: number
  rooms?: number
  bathrooms?: number
  pets?: boolean
  garage?: boolean
  contact?: string
  images?: string[]
}

export interface Property {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  metadata: RentalMetadata
  rental: RentalData | null
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
  user?: string
  owner?: string
  contact?: string
  pets?: boolean
  garage?: boolean
}

export interface Toast {
  id: number
  message: string
  severity: "success" | "info" | "warning" | "error"
  txHash?: string
}

export interface PropertyImport {
  id: number
  name: string
}
