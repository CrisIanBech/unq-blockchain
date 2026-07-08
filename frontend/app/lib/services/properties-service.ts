import { IPropertiesRepository } from "../repositories/properties-repository";
import { IRentalsRepository } from "../repositories/rentals-repository";
import { ethers } from "ethers";
import { Property, PropertyImport, RentalAgreementData, AddPropertyInput, CreateContractInput } from "@models/types";
import { RentalsService } from "./rentals-service";
import { reverseGeocode } from "@/lib/services/geocoding-service";
import { MetadataService } from "./metadata-service";
import { translateError } from "../errors/translator";
import { TransactionResultDTO, RentalCreationResultDTO } from "../../models/contract-dtos";

export class PropertiesService {
  constructor(
    private repo: IPropertiesRepository,
    private rentalsRepo: IRentalsRepository,
    private metadataService: MetadataService,
    private rentalsService: RentalsService
  ) { }

  async mintProperty(
    wallet: string,
    tokenURI: string,
    latitude: number,
    longitude: number
  ): Promise<{ tokenId?: number }> {
    try {
      const receipt = await this.repo.createProperty(wallet, tokenURI, latitude, longitude);
      let tokenId: number | undefined;

      for (const log of receipt.logs) {
        if (log.topics && log.topics.length === 4 && log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
          tokenId = Number(ethers.getBigInt(log.topics[3]));
          break;
        }
      }

      return { tokenId };
    } catch (error) {
      throw translateError(error);
    }
  }

  async fetchProperty(
    imp: PropertyImport,
    customAgreementAddress?: string
  ): Promise<Property> {
    const tokenId = imp.id;

    // Traer el property (metadata)
    const uri = await this.repo.getPropertyMetadataURI(tokenId);
    const rawMetadata = await this.metadataService.fetchMetadata(uri);

    const location = await this.repo.getPropertyLocation(tokenId);
    const latitude = location.lat;
    const longitude = location.lng;

    let addrAttr = "Dirección desconocida";
    if (latitude !== 0 || longitude !== 0) {
      addrAttr = (await reverseGeocode(latitude, longitude)) || `${latitude}, ${longitude}`;
    }

    const metadataObj = {
      type: rawMetadata.attributes?.find((a: any) => a.trait_type === "type")?.value || rawMetadata.type,
      surface: rawMetadata.surface,
      rooms: rawMetadata.rooms,
      bathrooms: rawMetadata.bathrooms,
      pets: rawMetadata.pets,
      garage: rawMetadata.garage,
      contact: rawMetadata.contact,
      images: rawMetadata.images
    };

    // Traer el rental a partir del property
    const rentalData = await this.repo.getRentalNFTData(tokenId);
    const rentalUser = rentalData.user;
    const propertyOwner = await this.repo.ownerOf(tokenId);

    // El contrato actual si el rental user es distinto al owner del property y es una address válida
    let currentContract: RentalAgreementData | null = null;
    let availableToWithdraw = 0;
    const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

    let agreementToFetch = rentalUser;
    
    // Si rentalUser no está asignado o es el dueño, pero tenemos un customAgreementAddress (contrato pendiente), usamos ese
    if ((!rentalUser || rentalUser === EMPTY_ADDRESS || rentalUser.toLowerCase() === propertyOwner.toLowerCase()) && customAgreementAddress) {
       agreementToFetch = customAgreementAddress;
    }

    if (agreementToFetch && agreementToFetch !== EMPTY_ADDRESS && (agreementToFetch === customAgreementAddress || agreementToFetch.toLowerCase() !== propertyOwner.toLowerCase())) {
      const details = await this.rentalsService.getRentalDetails(agreementToFetch);
      availableToWithdraw = await this.rentalsService.getWithdrawableRent(agreementToFetch);

      currentContract = {
        agreementAddress: agreementToFetch,
        propertyId: Number(details.propertyId),
        tenant: details.tenant,
        landlord: details.landlord,
        baseRent: details.baseRent,
        securityDeposit: details.securityDeposit,
        inflationBps: details.inflationBps,
        lateFeeBps: details.lateFeeBps,
        gracePeriod: details.gracePeriod,
        paymentPeriod: details.paymentPeriod,
        duration: details.duration,
        deadline: details.deadline,
        startTime: details.startTime,
        rentPaidUntil: details.rentPaidUntil,
        status: ["created", "draft", "active", "completed", "cancelled", "defaulted", "expired"][details.status] || "cancelled",
        landlordApproved: details.landlordApproved,
        tenantApproved: details.tenantApproved,
        landlordCancelled: details.landlordCancelled,
        tenantCancelled: details.tenantCancelled
      };
    }

    return {
      id: String(tokenId),
      name: imp.name,
      address: addrAttr,
      latitude,
      longitude,
      metadata: metadataObj,
      rental: {
        rentalNFTAddress: rentalData.rentalNFTAddress,
        user: rentalData.user,
        expires: rentalData.expires,
        currentContract,
        availableToWithdraw
      }
    };
  }



  async createRental(params: {
    propertyId: bigint;
    tenant: string;
    baseRent: number;
    securityDeposit: number;
    inflationBps: number;
    lateFeeBps: number;
    gracePeriod: number;
    paymentPeriod: number;
    inflationAdjustmentInterval: number;
    duration: number;
    deadline: number;
  }): Promise<RentalCreationResultDTO> {
    try {
      const baseRentRaw = ethers.parseUnits(params.baseRent.toString(), 6);
      const depositRaw = ethers.parseUnits(params.securityDeposit.toString(), 6);

      const repoParams = { ...params, baseRent: baseRentRaw, securityDeposit: depositRaw };
      const receipt = await this.rentalsRepo.createRental(repoParams);

      let agreementAddress = "";
      for (const log of receipt.logs) {
        const eventTopic = ethers.id("RentalAgreementCreated(address,uint256,address,uint256,uint256,uint256)");
        if (log.topics[0] === eventTopic) {
          const coder = ethers.AbiCoder.defaultAbiCoder();
          const decoded = coder.decode(["address"], log.topics[1]);
          agreementAddress = decoded[0];
          break;
        }
      }

      if (!agreementAddress) throw new Error("RentalAgreementCreated event not detected in blockchain logs.");
      return { agreementAddress, txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async approveAgreement(params: { agreementAddress: string; isTenant: boolean; depositAmount?: number; }): Promise<TransactionResultDTO> {
    try {
      const depositRaw = params.depositAmount !== undefined ? ethers.parseUnits(params.depositAmount.toString(), 6) : undefined;
      const receipt = await this.rentalsRepo.approveRental({ ...params, depositAmount: depositRaw });
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async payRent(agreementAddress: string, rentAmount: number): Promise<TransactionResultDTO> {
    try {
      const rentRaw = ethers.parseUnits(rentAmount.toString(), 6);
      const receipt = await this.rentalsRepo.payRent(agreementAddress, rentRaw);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async withdrawRent(agreementAddress: string): Promise<TransactionResultDTO> {
    try {
      const receipt = await this.rentalsRepo.withdrawRent(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async cancelAgreement(agreementAddress: string): Promise<TransactionResultDTO> {
    try {
      const receipt = await this.rentalsRepo.cancelRental(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async checkExpiration(agreementAddress: string): Promise<TransactionResultDTO> {
    try {
      const receipt = await this.rentalsRepo.checkRentalExpiration(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async releaseDeposit(agreementAddress: string): Promise<TransactionResultDTO> {
    try {
      const receipt = await this.rentalsRepo.releaseDeposit(agreementAddress);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }

  async claimDeposit(agreementAddress: string, amount: number, reason: string): Promise<TransactionResultDTO> {
    try {
      const amountRaw = ethers.parseUnits(amount.toString(), 6);
      const receipt = await this.rentalsRepo.claimDeposit(agreementAddress, amountRaw, reason);
      return { txHash: receipt.hash };
    } catch (error) {
      throw translateError(error);
    }
  }
}
