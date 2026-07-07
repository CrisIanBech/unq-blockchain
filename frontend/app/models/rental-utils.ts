import type { Rental, Property } from "./types"

/**
 * Returns the amount to pay for the current period, taking into account late fees if applicable.
 * Fallbacks to the base monthly rent if contract details are not loaded.
 */
export function getRentalAmountToPay(rental: Rental | Property): number {
  if ("amountToPay" in rental && rental.amountToPay !== undefined) {
    return rental.amountToPay
  }
  if ("baseRent" in rental && rental.baseRent !== undefined) {
    return rental.baseRent
  }
  if ("monthlyRent" in rental) {
    return rental.monthlyRent ?? 0
  }
  return 0
}

export function isRentalLandlord(rental: Rental, wallet?: string | null): boolean {
  if (!wallet) return false
  return rental.landlord.toLowerCase() === wallet.toLowerCase()
}

export function isRentalTenant(rental: Rental, wallet?: string | null): boolean {
  if (!wallet) return false
  return rental.tenant?.toLowerCase() === wallet.toLowerCase()
}

export function isRentalMine(rental: Rental, wallet?: string | null): boolean {
  return isRentalLandlord(rental, wallet) || isRentalTenant(rental, wallet)
}

export function hasUserCancelled(rental: Rental, wallet?: string | null): boolean {
  const isLandlord = isRentalLandlord(rental, wallet)
  const isTenant = isRentalTenant(rental, wallet)
  return Boolean(
    (isLandlord && rental.landlordCancelled) ||
    (isTenant && rental.tenantCancelled)
  )
}

export function hasOtherCancelled(rental: Rental, wallet?: string | null): boolean {
  const isLandlord = isRentalLandlord(rental, wallet)
  const isTenant = isRentalTenant(rental, wallet)
  return Boolean(
    (isLandlord && rental.tenantCancelled) ||
    (isTenant && rental.landlordCancelled)
  )
}

export function getRentalStatus(rental: Rental): number {
  return rental.status ?? 2
}

export function isRentalPendingSignatures(rental: Rental): boolean {
  return getRentalStatus(rental) === 1
}

export function isRentalActive(rental: Rental): boolean {
  return getRentalStatus(rental) === 2
}

export function isRentalCancelled(rental: Rental): boolean {
  return getRentalStatus(rental) === 4
}

export function isRentalExpired(rental: Rental): boolean {
  return getRentalStatus(rental) === 6
}

export function isRentalLate(rental: Rental | Property): boolean {
  if ("lateFeeAmount" in rental && rental.lateFeeAmount !== undefined && rental.lateFeeAmount > 0) return true;
  if (!("rentPaidUntil" in rental) || rental.rentPaidUntil === undefined || rental.gracePeriod === undefined) return false
  return (Date.now() / 1000) > rental.rentPaidUntil + rental.gracePeriod
}

export function getRentalTotalPeriods(rental: Rental | Property): number {
  if (!("duration" in rental) || rental.duration === undefined || rental.paymentPeriod === undefined) return 12
  return Math.floor(rental.duration / rental.paymentPeriod) || 12
}

export function getRentalPeriodsPaid(rental: Rental | Property): number {
  if (!("rentPaidUntil" in rental) || rental.rentPaidUntil === undefined || rental.startTime === undefined || rental.paymentPeriod === undefined) return 0
  return Math.floor((rental.rentPaidUntil - rental.startTime) / rental.paymentPeriod) || 0
}

export function getRentalPeriodStart(rental: Rental | Property): Date {
  if (!("startTime" in rental) || rental.startTime === undefined || rental.paymentPeriod === undefined) return new Date()
  const periodsPaid = getRentalPeriodsPaid(rental)
  return new Date((rental.startTime + periodsPaid * rental.paymentPeriod) * 1000)
}

export function getRentalPeriodEnd(rental: Rental | Property): Date {
  if (!("startTime" in rental) || rental.startTime === undefined || rental.paymentPeriod === undefined) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const periodsPaid = getRentalPeriodsPaid(rental)
  return new Date((rental.startTime + (periodsPaid + 1) * rental.paymentPeriod) * 1000)
}

export function getRentalPeriodLabelByIndex(rental: Rental | Property, periodIndex: number): string {
  if (!("startTime" in rental) || rental.startTime === undefined || rental.paymentPeriod === undefined) return ""
  
  const periodStart = new Date((rental.startTime + periodIndex * rental.paymentPeriod) * 1000)
  const periodEnd = new Date(periodStart.getTime() + rental.paymentPeriod * 1000)
  const dateOpts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "2-digit", year: "numeric" }
  return `${periodStart.toLocaleDateString("es-ES", dateOpts)} - ${periodEnd.toLocaleDateString("es-ES", dateOpts)}`
}

export function getRentalPeriodLabel(rental: Rental | Property): string {
  const periodsPaid = getRentalPeriodsPaid(rental)
  return getRentalPeriodLabelByIndex(rental, periodsPaid)
}

export function getRentalPeriodIdForRecord(rental: Rental | Property): string {
  const periodIndex = getRentalPeriodsPaid(rental)
  return String(periodIndex)
}

export function isRentalPaidUp(rental: Rental): boolean {
  const rentPaidUntil = (rental.rentPaidUntil ?? 0) * 1000
  return rentPaidUntil > Date.now()
}
