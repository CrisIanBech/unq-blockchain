import { ethers } from "ethers";
import { IRentalsRepository } from "../repositories/rentals-repository";
import { IPropertiesRepository } from "../repositories/properties-repository";
import { translateError } from "../errors/translator";
import { RentalAgreementDTO, PaymentEventDTO, RentalCreationResultDTO, TransactionResultDTO } from "../../models/contract-dtos";
import { MetadataService } from "./metadata-service";
import type { Rental, PropertyType } from "@models/types";
import { formatPropertyImage } from "@/lib/format";
import { reverseGeocode } from "@/lib/services/geocoding-service";

export class RentalsService {
  constructor(
    private repo: IRentalsRepository,
    private propertiesRepo: IPropertiesRepository,
    private metadataService: MetadataService
  ) { }

  async fetchRental(
    wallet: string,
    rentalImport: { name: string; address: string }
  ): Promise<Rental> {
    const address = rentalImport.address;
    const details = await this.getRentalDetails(address);
    
    const uri = await this.propertiesRepo.getPropertyMetadataURI(Number(details.propertyId));
    const metadata = await this.metadataService.fetchMetadata(uri);
    
    const amounts = await this.getRentAmountToPay(address);

    const typeAttr = metadata.attributes?.find((a: any) => a.trait_type === "type")?.value || "departamento";
    
    const location = await this.propertiesRepo.getPropertyLocation(Number(details.propertyId));
    const latitude = location.lat;
    const longitude = location.lng;
    
    let addrAttr = "Dirección desconocida";
    if (latitude !== 0 || longitude !== 0) {
      addrAttr = (await reverseGeocode(latitude, longitude)) || "Dirección desconocida";
    }

    const newRental: Rental = {
      id: address,
      propertyId: Number(details.propertyId),
      name: rentalImport.name || metadata.name || `Propiedad #${details.propertyId.toString()}`,
      type: typeAttr as PropertyType,
      address: addrAttr,
      imageUrl: formatPropertyImage(metadata.images || metadata.image, addrAttr),
      landlord: details.landlord,
      tenant: details.tenant,
      baseRent: amounts.currentRent,
      securityDeposit: details.securityDeposit,
      inflationBps: details.inflationBps,
      inflationAdjustmentInterval: details.inflationAdjustmentInterval,
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
  }

  async getRentAmountToPay(agreementAddress: string) {
    try {
      const amounts = await this.repo.getRentAmountToPay(agreementAddress);

      return {
        currentRent: Number(ethers.formatUnits(amounts.currentRent, 6)),
        lateFee: Number(ethers.formatUnits(amounts.lateFee, 6)),
        totalAmount: Number(ethers.formatUnits(amounts.totalAmount, 6))
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getRentalDetails(agreementAddress: string): Promise<RentalAgreementDTO> {
    try {
      const details = await this.repo.getRentalDetails(agreementAddress);
      return {
        propertyId: Number(details.propertyId),
        tenant: details.tenant,
        landlord: details.landlord,
        baseRent: Number(ethers.formatUnits(details.baseRent, 6)),
        rentPaidUntil: Number(details.rentPaidUntil),
        status: details.status,
        startTime: Number(details.startTime),
        paymentPeriod: Number(details.paymentPeriod),
        securityDeposit: Number(ethers.formatUnits(details.securityDeposit, 6)),
        inflationBps: Number(details.inflationBps),
        lateFeeBps: Number(details.lateFeeBps),
        gracePeriod: Number(details.gracePeriod),
        duration: Number(details.duration),
        deadline: Number(details.deadline),
        landlordApproved: details.landlordApproved,
        tenantApproved: details.tenantApproved,
        landlordCancelled: details.landlordCancelled,
        tenantCancelled: details.tenantCancelled,
        inflationAdjustmentInterval: Number(details.inflationAdjustmentInterval),
        depositStatus: details.depositStatus
      };
    } catch (error) {
      throw translateError(error);
    }
  }

  async getPaymentHistory(agreementAddress: string): Promise<PaymentEventDTO[]> {
    try {
      const events = await this.repo.getPaymentHistory(agreementAddress);

      return events.map(e => ({
        periodIndex: e.periodIndex,
        amount: Number(ethers.formatUnits(e.amount, 6)),
        lateFee: Number(ethers.formatUnits(e.lateFee, 6)),
        txHash: e.txHash,
        timestamp: e.timestamp
      }));
    } catch (error) {
      throw translateError(error);
    }
  }

  async getRentalAgreementForProperty(propertyId: number): Promise<string | null> {
    try {
      return await this.repo.getRentalAgreementForProperty(propertyId);
    } catch (error) {
      throw translateError(error);
    }
  }

  async getWithdrawableRent(agreementAddress: string): Promise<number> {
    try {
      const balance = await this.repo.getWithdrawableRent(agreementAddress);
      return Number(ethers.formatUnits(balance, 6));
    } catch (error) {
      throw translateError(error);
    }
  }
}
