import { getServices } from "@/lib/services/service-registry";
import { ethers } from "ethers";
import { getLatestBlockTimestamp, CONTRACT_ADDRESSES } from "@/lib/blockchain-infra";
import type { Property, PaymentRecord } from "@models/types";
import { getRentalPeriodLabelByIndex } from "@/models/rental-utils";

export async function loadOwnedProperties(
  wallet: string,
  imports: { id: number; name: string }[],
  customContracts: Record<number, string> = {}
): Promise<Property[]> {
  const { propertiesService, rentalsService } = getServices(wallet);

  const allProps = await Promise.all(imports.map(async (imp) => {
    const tokenId = imp.id;
    try {
      const [metadata, location] = await Promise.all([
        propertiesService.getPropertyMetadata(tokenId),
        propertiesService.getPropertyLocation(tokenId),
      ]);

      const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
      const addrAttr = metadata.attributes?.find((a: any) => a.trait_type === "address")?.value || metadata.address || "Dirección desconocida";
      const rentAttr = Number(metadata.attributes?.find((a: any) => a.trait_type === "monthlyRent")?.value || metadata.monthlyRent || 0);

      return {
        propertyId: tokenId,
        name: imp.name || metadata.name || `Propiedad #${tokenId}`,
        type: typeAttr,
        address: addrAttr,
        imageUrl: metadata.image || `/images/prop-${(tokenId % 5) + 1}.png`,
        monthlyRent: rentAttr,
        latitude: location.lat,
        longitude: location.lng,
      };
    } catch (err) {
      console.error(`Failed to fetch metadata for token ${tokenId}`, err);
      return {
        propertyId: tokenId,
        name: imp.name || `Propiedad #${tokenId}`,
        type: "departamento" as const,
        address: "Dirección no disponible",
        imageUrl: `/images/prop-${(tokenId % 5) + 1}.png`,
        monthlyRent: 0,
        latitude: undefined as number | undefined,
        longitude: undefined as number | undefined,
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
    const onChainAgreement = await rentalsService.getRentalAgreementForProperty(tokenId);
    let agreementAddress = customContracts[tokenId];
    let details: any = null;

    if (onChainAgreement) {
      try {
        details = await rentalsService.getRentalDetails(onChainAgreement);
        const isActiveOrDraft = details.status === 0 || details.status === 1 || details.status === 2;
        if (isActiveOrDraft) {
          agreementAddress = onChainAgreement;
        } else if (!agreementAddress) {
          agreementAddress = onChainAgreement;
        }
      } catch (e) {
        if (!agreementAddress) agreementAddress = onChainAgreement;
      }
    }

    if (agreementAddress && (!details || agreementAddress !== onChainAgreement)) {
      try {
        details = await rentalsService.getRentalDetails(agreementAddress);
      } catch (e) {
        console.error("Failed to fetch rental details", agreementAddress);
      }
    }

    let tenant: string | null = null;
    let availableToWithdraw = 0;
    let contractStatus: "draft" | "active" | "cancelled" = "cancelled";
    let tenantSince: string | undefined = undefined;
    let nextChargeDate: string | undefined = undefined;
    let payments: PaymentRecord[] = [];
    let monthlyRent = baseProp.monthlyRent;
    let landlordApproved = false;
    let tenantApproved = false;
    let contract: any = null;

    if (agreementAddress && details) {
      const statusNum = details.status;
      landlordApproved = details.landlordApproved;
      tenantApproved = details.tenantApproved;

      if (statusNum === 2 /* Active */) {
        contractStatus = "active";
        tenant = details.tenant;
        tenantSince = new Date(Number(details.startTime) * 1000).toISOString().slice(0, 10);
        nextChargeDate = new Date(Number(details.rentPaidUntil) * 1000).toISOString().slice(0, 10);

        try {
          const amounts = await rentalsService.getRentAmountToPay(agreementAddress);
          monthlyRent = amounts.currentRent;
        } catch (e) {
          console.error("Failed to fetch inflated rent", e);
          monthlyRent = details.baseRent;
        }
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

      // Fetch actual payment history
      if (contractStatus === "active" || contractStatus === "cancelled") {
        const history = await rentalsService.getPaymentHistory(agreementAddress);
        const st = Number(details.startTime);
        const period = Number(details.paymentPeriod) || (30 * 24 * 60 * 60);
        const grace = Number(details.gracePeriod) || (5 * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);

        // Compute total periods up to current time (or at least 1)
        const totalPeriods = Math.max(1, Math.floor((now - st) / period) + 1);

        const paidMap = new Map();
        for (const h of history) {
          paidMap.set(h.periodIndex, h);
        }

        for (let i = 0; i < totalPeriods; i++) {
          const pStart = st + i * period;
          const monthStr = new Date(pStart * 1000).toISOString().slice(0, 7);

          if (paidMap.has(i)) {
            const p = paidMap.get(i);
            const periodLabel = getRentalPeriodLabelByIndex({
              startTime: Number(details.startTime),
              paymentPeriod: Number(details.paymentPeriod)
            } as any, i);

            payments.push({
              month: monthStr,
              periodLabel,
              amount: p.amount,
              lateFee: p.lateFee > 0 ? p.lateFee : undefined,
              status: "paid",
              txHash: p.txHash,
            });
          } else if (contractStatus === "active") {
            let pStatus: "pending" | "overdue" | "paid" = "pending";
            let lateFeeAmount = undefined;
            if (now > pStart + grace) {
              pStatus = "overdue";
              lateFeeAmount = (monthlyRent * details.lateFeeBps) / 10000;
            }
            const periodLabel = getRentalPeriodLabelByIndex({
              startTime: Number(details.startTime),
              paymentPeriod: Number(details.paymentPeriod)
            } as any, i);

            payments.push({
              month: monthStr,
              periodLabel,
              amount: monthlyRent,
              lateFee: lateFeeAmount,
              status: pStatus,
            });
          }
        }
      }

      contract = {
        agreementAddress,
        tenant,
        tenantSince,
        nextChargeDate,
        payments,
        availableToWithdraw,
        status: contractStatus,
        landlordApproved,
        tenantApproved,
      };
    }

    const ownedProp: Property = {
      id: `own-${tokenId}`,
      propertyId: tokenId,
      name: baseProp.name,
      type: baseProp.type as any,
      address: baseProp.address,
      latitude: baseProp.latitude,
      longitude: baseProp.longitude,
      monthlyRent: monthlyRent,
      contract
    };

    return ownedProp;
  }));

  return loadedProps;
}
