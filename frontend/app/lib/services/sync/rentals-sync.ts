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
      const paymentPeriod = Number(details.paymentPeriod) || 30 * 24 * 60 * 60;
      const periodStart = new Date((Number(details.startTime) + e.periodIndex * paymentPeriod) * 1000);
      const periodEnd = new Date((Number(details.startTime) + (e.periodIndex + 1) * paymentPeriod) * 1000);
      
      const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
      const periodLabel = `${periodStart.toLocaleDateString("es-ES", dateOpts)} - ${periodEnd.toLocaleDateString("es-ES", dateOpts)}`;

      return {
        month: `${periodStart.getFullYear()}-${String(periodStart.getMonth() + 1).padStart(2, "0")}-${e.periodIndex}`, // unique id for the period
        periodLabel,
        amount: e.amount + (e.lateFee || 0),
        lateFee: e.lateFee,
        status: "paid" as const,
        txHash: e.txHash,
        paidAt: periodStart.toISOString()
      };
    });

    const totalPeriods = Math.floor(details.duration / details.paymentPeriod) || 12;
    const periodsPaid = Math.floor((details.rentPaidUntil - details.startTime) / details.paymentPeriod) || 0;
    const periodStart = new Date((details.startTime + periodsPaid * details.paymentPeriod) * 1000);
    const periodEnd = new Date((details.startTime + (periodsPaid + 1) * details.paymentPeriod) * 1000);
    const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
    const periodLabel = `${periodStart.toLocaleDateString("es-ES", dateOpts)} - ${periodEnd.toLocaleDateString("es-ES", dateOpts)}`;
    const monthLabelForRecord = periodStart.toISOString().slice(0, 7);

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
        isLate: amounts.lateFee > 0,
        status: Number(details.status),
        landlordApproved: details.landlordApproved,
        tenantApproved: details.tenantApproved,
        landlordCancelled: details.landlordCancelled,
        tenantCancelled: details.tenantCancelled,
        totalPeriods,
        periodsPaid,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        periodLabel,
        monthLabelForRecord
      }
    };

    return newRental;
  }));

  return loadedRentals;
}
