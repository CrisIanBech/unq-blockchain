import { IPropertiesRepository } from "../repositories/properties-repository";
import { IGeocodingRepository } from "../repositories/geocoding-repository";
import { Property, PropertyImport, RentalAgreementData } from "@models/types";
import { RentalsService } from "./rentals-service";
import { reverseGeocode } from "@/lib/services/geocoding-service";
import { MetadataService } from "./metadata-service";

export class PropertiesService {
  constructor(
    private repo: IPropertiesRepository,
    private geocodingRepo: IGeocodingRepository,
    private metadataService: MetadataService,
    private rentalsService: RentalsService
  ) { }

  async fetchProperty(
    imp: PropertyImport
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

    if (rentalUser && rentalUser !== EMPTY_ADDRESS && rentalUser.toLowerCase() !== propertyOwner.toLowerCase()) {
      const details = await this.rentalsService.getRentalDetails(rentalUser);
      availableToWithdraw = await this.rentalsService.getWithdrawableRent(rentalUser);

      currentContract = {
        agreementAddress: rentalUser,
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
        status: ["draft", "active", "cancelled", "expired", "completed", "defaulted"][details.status] || "cancelled",
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
}
