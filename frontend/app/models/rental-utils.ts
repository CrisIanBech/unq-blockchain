import type { Rental, OwnedProperty } from "./types"

/**
 * Returns the amount to pay for the current period, taking into account late fees if applicable.
 * Fallbacks to the base monthly rent if contract details are not loaded.
 */
export function getRentalAmountToPay(rental: Rental | OwnedProperty): number {
  if ("contractDetails" in rental) {
    return rental.contractDetails?.amountToPay ?? rental.monthlyRent
  }
  return rental.monthlyRent
}
