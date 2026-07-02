import { getServices } from "@/lib/services/service-registry";
import type { PaymentRecord } from "@models/types";

export class RentalDashboardService {
  async payRent(
    wallet: string,
    agreementAddress: string,
    amount: number,
    month: string
  ): Promise<{ txHash: string; payments: PaymentRecord[] }> {
    const { rentalsService } = getServices(wallet);
    const result = await rentalsService.payRent(agreementAddress, amount);

    // Refetch history from service
    const updatedHistory = await rentalsService.getPaymentHistory(agreementAddress);
    const payments: PaymentRecord[] = updatedHistory.map((e, i) => ({
      month: month + i.toString(), // Mock mapping just to fulfill type
      amount: e.amount,
      status: "paid" as const,
      paidAt: new Date().toISOString(),
      txHash: e.txHash
    }));

    return {
      txHash: result.txHash,
      payments
    };
  }
}
