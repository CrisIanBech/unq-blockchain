import { PropertiesService } from "./properties-service";
import { RentalsService } from "./rentals-service";
import { PropertiesRepository } from "../repositories/properties-repository";
import { RentalsRepository } from "../repositories/rentals-repository";
import { GeocodingRepository } from "../repositories/geocoding-repository";

export function getServices(_wallet?: string) {
  return {
    propertiesService: new PropertiesService(new PropertiesRepository(), new GeocodingRepository()),
    rentalsService: new RentalsService(new RentalsRepository())
  };
}
