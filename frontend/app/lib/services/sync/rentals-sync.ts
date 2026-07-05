import { getServices } from "@/lib/services/service-registry";
import { getLatestBlockTimestamp } from "@/lib/blockchain-infra";
import type { Rental, PaymentRecord, PropertyType } from "@models/types";

export async function loadRentals(
  wallet: string,
  imports: { name: string; address: string }[]
): Promise<Rental[]> {
  const { rentalsService, propertiesService } = getServices(wallet);
  const currentTimestamp = await getLatestBlockTimestamp();

  const loadedRentals = await Promise.all(imports.map(async (rentalImport) => {
    const address = rentalImport.address;
    const details = await rentalsService.getRentalDetails(address);
    const metadata = await propertiesService.getPropertyMetadata(Number(details.propertyId));
    const amounts = await rentalsService.getRentAmountToPay(address);
    const history = await rentalsService.getPaymentHistory(address);

    const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
    const addrAttr = metadata.attributes?.find((a: any) => a.trait_type === "address")?.value || "Dirección desconocida";

    const payments: PaymentRecord[] = history.map((e) => {
      const payDate = new Date((Number(details.startTime) + e.periodIndex * 30 * 24 * 60 * 60) * 1000);
      return {
        month: `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, "0")}`,
        amount: e.amount,
        status: "paid" as const,
        txHash: e.txHash,
        paidAt: payDate.toISOString()
      };
    });

    const newRental: Rental = {
      id: address,
      agreementAddress: address,
      propertyId: Number(details.propertyId),
      name: rentalImport.name || metadata.name || `Propiedad #${details.propertyId.toString()}`,
      type: typeAttr as PropertyType,
      address: addrAttr,
      imageUrl: metadata.image || "/images/prop-placeholder.png",
      landlord: details.landlord,
      tenant: details.tenant,
      monthlyRent: Number(details.baseRent),
      payments,
      nextPaymentDate: new Date(details.rentPaidUntil * 1000).toISOString().slice(0, 10),
      contractDetails: {
        baseRent: amounts.currentRent,
        securityDeposit: amounts.currentRent,
        inflationBps: 0,
        lateFeeBps: 1000,
        gracePeriod: 5 * 86400,
        paymentPeriod: details.paymentPeriod,
        duration: 12 * details.paymentPeriod,
        deadline: 0,
        startTime: details.startTime,
        rentPaidUntil: details.rentPaidUntil,
        amountToPay: amounts.totalAmount,
        lateFeeAmount: amounts.lateFee,
        isLate: amounts.lateFee > 0
      }
    };

    return newRental;
  }));

  return loadedRentals;
}
