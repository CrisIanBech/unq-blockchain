import { PropertiesService } from "./properties-service";
import { RentalsService } from "./rentals-service";
import { PropertiesRepository } from "../repositories/properties-repository";
import { RentalsRepository } from "../repositories/rentals-repository";
import { GeocodingRepository } from "../repositories/geocoding-repository";
import { MetadataService } from "./metadata-service";

export function getServices() {
  const propertiesRepo = new PropertiesRepository();
  const metadataService = new MetadataService();
  const geocodingRepo = new GeocodingRepository();

  const rentalsRepo = new RentalsRepository();

  const rentalsService = new RentalsService(
    rentalsRepo,
    propertiesRepo,
    metadataService
  );

  const propertiesService = new PropertiesService(
    propertiesRepo,
    rentalsRepo,
    metadataService,
    rentalsService
  );

  return {
    rentalsService,
    propertiesService
  };
}
