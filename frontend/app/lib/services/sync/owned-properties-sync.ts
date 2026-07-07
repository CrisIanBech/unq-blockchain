import { getServices } from "@/lib/services/service-registry";
import { getLatestBlockTimestamp, CONTRACT_ADDRESSES } from "@/lib/blockchain-infra";
import type { OwnedProperty, PaymentRecord } from "@models/types";
import { formatPropertyImage } from "@/lib/format";

export async function loadOwnedProperties(
  wallet: string,
  imports: number[],
  existingProperties: OwnedProperty[]
): Promise<OwnedProperty[]> {
  const { propertiesService, rentalsService } = getServices(wallet);
  const currentTimestamp = await getLatestBlockTimestamp();

  // 1. Get base owned properties from imported property IDs on-chain
  const allProps = await Promise.all(imports.map(async (tokenId) => {
    try {
      const metadata = await propertiesService.getPropertyMetadata(tokenId);
      
      const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
      const addrAttr = metadata.attributes?.find((a: any) => a.trait_type === "address")?.value || metadata.address || "Dirección desconocida";
      const rentAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "monthlyRent")?.value || metadata.monthlyRent || 0);
      const surfaceAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "surface")?.value || 0);
      const roomsAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "rooms")?.value || 0);
      const bathroomsAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "bathrooms")?.value || 0);
      
      const petsVal = metadata.attributes?.find((a: any) => a.trait_type === "pets")?.value;
      const petsAttr = petsVal === true || petsVal === "true";

      const garageVal = metadata.attributes?.find((a: any) => a.trait_type === "garage")?.value;
      const garageAttr = garageVal === true || garageVal === "true";

      const imagesAttr = metadata.images || [];

      return {
        propertyId: tokenId,
        name: metadata.name || `Propiedad #${tokenId}`,
        type: typeAttr,
        address: addrAttr,
        imageUrl: formatPropertyImage(metadata.images || metadata.image, addrAttr),
        monthlyRent: rentAttr,
        surface: surfaceAttr,
        rooms: roomsAttr,
        bathrooms: bathroomsAttr,
        pets: petsAttr,
        garage: garageAttr,
        images: imagesAttr,
      };
    } catch (err) {
      console.error(`Failed to fetch metadata for token ${tokenId}`, err);
      return {
        propertyId: tokenId,
        name: `Propiedad #${tokenId}`,
        type: "departamento" as const,
        address: "Dirección no disponible",
        imageUrl: "/images/prop-placeholder.png",
        monthlyRent: 0,
        surface: 0,
        rooms: 0,
        bathrooms: 0,
        pets: false,
        garage: false,
        images: [],
      };
    }
  }));

  // Filter out properties that are no longer owned by this wallet
  const baseProps: typeof allProps = [];
  for (const baseProp of allProps) {
    try {
      const owner = await propertiesService.getPropertyOwner(baseProp.propertyId);
      if (owner.toLowerCase() === wallet.toLowerCase()) {
        baseProps.push(baseProp);
      }
    } catch (_err) {
      // Skip if owner check fails (e.g. token burned or node reset)
    }
  }

  // 2. Fetch rental details and status for each property
  const loadedProps = await Promise.all(baseProps.map(async (baseProp) => {
    const tokenId = baseProp.propertyId;
    const agreementAddress = await rentalsService.getRentalAgreementForProperty(tokenId);
    
    let tenant: string | null = null;
    let availableToWithdraw = 0;
    let contractStatus: "draft" | "active" | "cancelled" = "draft";
    let tenantSince: string | undefined = undefined;
    let nextChargeDate: string | undefined = undefined;
    let payments: PaymentRecord[] = [];
    let monthlyRent = baseProp.monthlyRent;
    let landlordApproved = false;
    let tenantApproved = false;

    if (agreementAddress) {
      const details = await rentalsService.getRentalDetails(agreementAddress);
      const statusNum = details.status;
      landlordApproved = details.landlordApproved;
      tenantApproved = details.tenantApproved;
      
      if (statusNum === 2 /* Active */) {
        contractStatus = "active";
        tenant = details.tenant;
        tenantSince = new Date(Number(details.startTime) * 1000).toISOString().slice(0, 10);
        nextChargeDate = new Date(Number(details.rentPaidUntil) * 1000).toISOString().slice(0, 10);
        monthlyRent = details.baseRent;
      } else if (statusNum === 0 || statusNum === 1) {
        contractStatus = "draft";
        tenant = details.tenant;
        monthlyRent = details.baseRent;
      } else {
        contractStatus = "cancelled";
        tenant = null;
      }

      // Fetch USDC retirable balance
      availableToWithdraw = await rentalsService.getWithdrawableRent(agreementAddress);

      // Fetch past payment records
      const history = await rentalsService.getPaymentHistory(agreementAddress);
      payments = history.map((e) => {
        const payDate = new Date((Number(details.startTime) + e.periodIndex * 30 * 24 * 60 * 60) * 1000);
        return {
          month: `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, "0")}`,
          amount: e.amount,
          status: "paid" as const,
          paidAt: payDate.toISOString(),
          txHash: e.txHash
        };
      });

      // Synthesize pending/overdue rent
      const nowSec = currentTimestamp;
      const nextPaymentDue = Number(details.rentPaidUntil);
      if (nowSec > nextPaymentDue && statusNum === 2 /* Active */) {
        const isLate = nowSec > nextPaymentDue + 5 * 24 * 60 * 60; // 5 days grace period
        const nextPeriodDate = new Date(nextPaymentDue * 1000);
        payments.unshift({
          month: `${nextPeriodDate.getFullYear()}-${String(nextPeriodDate.getMonth() + 1).padStart(2, "0")}`,
          amount: details.baseRent,
          status: isLate ? "overdue" as const : "pending" as const
        });
      }
    }

    // Preserve current local smartlock status to prevent UI lock loss
    const existingProp = existingProperties.find((p) => p.propertyId === tokenId);
    const smartlock = existingProp?.smartlock || {
      id: `lock-${tokenId}`,
      installed: false,
      nfcEnabled: false,
      unlocked: false
    };

    const ownedProp: OwnedProperty = {
      id: `own-${tokenId}`,
      propertyId: tokenId,
      name: baseProp.name,
      type: baseProp.type as any,
      address: baseProp.address,
      imageUrl: baseProp.imageUrl,
      realEstateToken: CONTRACT_ADDRESSES.propertyNft,
      rentalToken: "",
      agreementAddress: agreementAddress || undefined,
      monthlyRent,
      tenant,
      tenantSince,
      nextChargeDate,
      payments,
      availableToWithdraw,
      smartlock,
      contractStatus,
      landlordApproved,
      tenantApproved,
    };

    return ownedProp;
  }));

  return loadedProps;
}
