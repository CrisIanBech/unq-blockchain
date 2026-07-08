import type { Property } from "./types"

export function getPropertyContract(property: Property) {
  return property.rental?.currentContract || null
}

export function isPropertyOverdue(property: Property): boolean {
  const contract = getPropertyContract(property);
  if (!contract || !contract.rentPaidUntil) return false;
  
  const now = Math.floor(Date.now() / 1000);
  const grace = Number(contract.gracePeriod) || 0;
  const paidUntil = Number(contract.rentPaidUntil);
  
  return now > (paidUntil + grace);
}

export function getPropertyAvailableToWithdraw(property: Property): number {
  return property.contract?.availableToWithdraw || 0
}

export function canPropertyWithdraw(property: Property): boolean {
  return getPropertyAvailableToWithdraw(property) > 0
}

export function getPropertyContractStatus(property: Property): string {
  return property.contract?.status || "cancelled"
}

export function isPropertyContractDraft(property: Property): boolean {
  return getPropertyContractStatus(property) === "draft"
}

export function isPropertyContractActive(property: Property): boolean {
  return getPropertyContractStatus(property) === "active"
}

export function isPropertyContractCancelled(property: Property): boolean {
  return getPropertyContractStatus(property) === "cancelled"
}

export function isPropertyLandlordApproved(property: Property): boolean {
  return property.contract?.landlordApproved || false
}

export function getPropertyTenant(property: Property): string | null {
  return property.contract?.tenant || null
}

export function getPropertyTenantSince(property: Property): string | undefined {
  return property.contract?.tenantSince
}

export function getPropertyAgreementAddress(property: Property): string | undefined {
  return property.contract?.agreementAddress
}

export function getPropertyNextChargeDate(property: Property): string {
  return property.contract?.nextChargeDate ?? ""
}

export function getPropertyStatusDetails(property: Property): { label: string; color: "success" | "warning" | "default" | "error", variant?: "filled" | "outlined" } {
  const status = getPropertyContractStatus(property)

  if (status === "draft") {
    const landlordApproved = property.contract?.landlordApproved;
    const tenantApproved = property.contract?.tenantApproved;

    if (!landlordApproved) {
      return { label: "Pendiente de firma del propietario", color: "warning" }
    } else if (!tenantApproved) {
      return { label: "Pendiente de firma del inquilino", color: "warning" }
    }
  }

  switch (status) {
    case "active":
      return { label: "Contrato activo", color: "success", variant: "filled" }
    case "draft":
      return { label: "Borrador", color: "warning", variant: "filled" }
    case "cancelled":
    default:
      return { label: "Disponible", color: "success", variant: "outlined" }
  }
}
