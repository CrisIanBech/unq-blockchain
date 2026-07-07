import { getServices } from "@/lib/services/service-registry";
import type { Rental, PropertyType } from "@models/types";
import { formatPropertyImage } from "@/lib/format";

export async function loadRentals(
  wallet: string,
  imports: { name: string; address: string }[]
): Promise<Rental[]> {
  const { rentalsService, propertiesService } = getServices(wallet);

  const loadedRentals = await Promise.all(imports.map(async (rentalImport) => {
    const address = rentalImport.address;
    const details = await rentalsService.getRentalDetails(address);
    const metadata = await propertiesService.getPropertyMetadata(Number(details.propertyId));
    const amounts = await rentalsService.getRentAmountToPay(address);

    const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
    const addrAttr = metadata.attributes?.find((a: any) => a.trait_type === "address")?.value || "Dirección desconocida";
    const surfaceAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "surface")?.value || 0);
    const roomsAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "rooms")?.value || 0);
    const bathroomsAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "bathrooms")?.value || 0);
    
    const petsVal = metadata.attributes?.find((a: any) => a.trait_type === "pets")?.value;
    const petsAttr = petsVal === true || petsVal === "true";

    const garageVal = metadata.attributes?.find((a: any) => a.trait_type === "garage")?.value;
    const garageAttr = garageVal === true || garageVal === "true";

    const imagesAttr = metadata.images || [];

    const newRental: Rental = {
      id: address,
      propertyId: Number(details.propertyId),
      name: rentalImport.name || metadata.name || `Propiedad #${details.propertyId.toString()}`,
      type: typeAttr as PropertyType,
      address: addrAttr,
      imageUrl: formatPropertyImage(metadata.images || metadata.image, addrAttr),
      surface: surfaceAttr,
      rooms: roomsAttr,
      bathrooms: bathroomsAttr,
      pets: petsAttr,
      garage: garageAttr,
      images: imagesAttr,
      landlord: details.landlord,
      tenant: details.tenant,
      baseRent: amounts.currentRent,
      securityDeposit: details.securityDeposit,
      inflationBps: details.inflationBps,
      lateFeeBps: details.lateFeeBps,
      gracePeriod: details.gracePeriod,
      paymentPeriod: details.paymentPeriod,
      duration: details.duration,
      deadline: details.deadline,
      startTime: details.startTime,
      rentPaidUntil: details.rentPaidUntil,
      amountToPay: amounts.totalAmount,
      lateFeeAmount: amounts.lateFee,
      status: Number(details.status),
      landlordApproved: details.landlordApproved,
      tenantApproved: details.tenantApproved,
      landlordCancelled: details.landlordCancelled,
      tenantCancelled: details.tenantCancelled
    };

    return newRental;
  }));

  return loadedRentals;
}
