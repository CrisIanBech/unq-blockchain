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
  return property.rental?.availableToWithdraw || 0
}

export function canPropertyWithdraw(property: Property): boolean {
  return getPropertyAvailableToWithdraw(property) > 0
}

export function getPropertyContractStatus(property: Property): string {
  return getPropertyContract(property)?.status || "cancelled"
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
  return getPropertyContract(property)?.landlordApproved || false
}

export function getPropertyTenant(property: Property): string | null {
  return getPropertyContract(property)?.tenant || null
}

export function getPropertyTenantSince(property: Property): string | undefined {
  const contract = getPropertyContract(property)
  return contract?.startTime ? new Date(contract.startTime * 1000).toISOString() : undefined
}

export function getPropertyAgreementAddress(property: Property): string | undefined {
  return getPropertyContract(property)?.agreementAddress
}

export function getPropertyNextChargeDate(property: Property): string {
  const contract = getPropertyContract(property)
  return contract?.rentPaidUntil ? new Date(contract.rentPaidUntil * 1000).toISOString() : ""
}

export function getPropertyStatusDetails(property: Property): { label: string; color: "success" | "warning" | "default" | "error", variant?: "filled" | "outlined" } {
  const status = getPropertyContractStatus(property)

  if (status === "draft") {
    const landlordApproved = getPropertyContract(property)?.landlordApproved;
    const tenantApproved = getPropertyContract(property)?.tenantApproved;

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
